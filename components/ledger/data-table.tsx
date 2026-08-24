// components/ledger/data-table.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, X, Calendar, Filter, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "./export-buttons";
import { LedgerEntry } from "./columns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DataTableProps {
  columns: ColumnDef<LedgerEntry>[];
  data: LedgerEntry[];
  sheetId: string;
  sheetName: string;
}

export function DataTable({
  columns,
  data,
  sheetId,
  sheetName,
}: DataTableProps) {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCode, setSelectedCode] = useState<string>("ALL");
  const [showBulkDeleteAlert, setShowBulkDeleteAlert] = useState(false);

  // Controlled pagination state (50 items per page)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });

  const lastSheetIdRef = useRef<string>(sheetId);
  const initialLoadDoneRef = useRef<boolean>(false);

  const uniqueCodes = useMemo(() => {
    const codes = new Set<string>();
    data.forEach((item) => {
      if (item.code) codes.add(item.code.trim());
    });
    return Array.from(codes).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const itemDate = new Date(item.date).toISOString().split("T")[0];

      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      if (selectedCode !== "ALL" && item.code !== selectedCode) return false;

      return true;
    });
  }, [data, startDate, endDate, selectedCode]);

  // Set default page to the last page on initial load or sheet switch
  useEffect(() => {
    const isNewSheet = lastSheetIdRef.current !== sheetId;
    if (isNewSheet) {
      lastSheetIdRef.current = sheetId;
      initialLoadDoneRef.current = false;
    }

    if (filteredData.length > 0 && !initialLoadDoneRef.current) {
      const lastPageIndex = Math.max(
        0,
        Math.ceil(filteredData.length / pagination.pageSize) - 1,
      );
      setPagination((prev) => ({ ...prev, pageIndex: lastPageIndex }));
      initialLoadDoneRef.current = true;
    }
  }, [filteredData.length, sheetId, pagination.pageSize]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
    autoResetPageIndex: false, // Prevents jumping to page 1 on edits and mutations
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: (val) => {
      setGlobalFilter(val);
      // Reset to first page when actively searching
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map((r) => r.original.id);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/transactions/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Failed to delete transactions");
      return res.json();
    },
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["transactions", sheetId] });
      const previous = queryClient.getQueryData<LedgerEntry[]>([
        "transactions",
        sheetId,
      ]);

      if (previous) {
        const idSet = new Set(ids);
        queryClient.setQueryData<LedgerEntry[]>(
          ["transactions", sheetId],
          previous.filter((item) => !idSet.has(item.id)),
        );
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["transactions", sheetId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", sheetId] });
      setRowSelection({});
      setShowBulkDeleteAlert(false);
    },
  });

  const isFiltered =
    globalFilter !== "" ||
    startDate !== "" ||
    endDate !== "" ||
    selectedCode !== "ALL";

  const resetFilters = () => {
    setGlobalFilter("");
    setStartDate("");
    setEndDate("");
    setSelectedCode("ALL");
    setColumnFilters([]);
  };

  const visibleExportData = table
    .getFilteredRowModel()
    .rows.map((r) => r.original);

  return (
    <div className="space-y-4">
      {/* Filtering Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search description..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={selectedCode}
              onChange={(e) => {
                setSelectedCode(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-700 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
            >
              <option value="ALL">All Codes</option>
              {uniqueCodes.map((code) => (
                <option key={code} value={code}>
                  Kode: {code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="h-9 w-32 text-xs"
            />
            <span className="text-xs text-zinc-400">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="h-9 w-32 text-xs"
            />
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <X className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteAlert(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.length})
            </Button>
          )}

          <ExportButtons data={visibleExportData} sheetName={sheetName} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/75 dark:text-zinc-400">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 font-semibold tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="transition-colors hover:bg-zinc-50/50 data-[state=selected]:bg-zinc-100/60 dark:hover:bg-zinc-900/50 dark:data-[state=selected]:bg-zinc-800/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-32 text-center text-zinc-400"
                >
                  No transactions match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-zinc-500">
          {selectedIds.length > 0 ? (
            <span>
              {selectedIds.length} of {table.getFilteredRowModel().rows.length}{" "}
              row(s) selected.
            </span>
          ) : (
            <span>
              Showing {table.getRowModel().rows.length} of {filteredData.length}{" "}
              entries
            </span>
          )}
        </div>

        {table.getPageCount() > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <span className="text-xs text-zinc-500">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Delete Dialog */}
      <AlertDialog
        open={showBulkDeleteAlert}
        onOpenChange={setShowBulkDeleteAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.length} Transactions?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {selectedIds.length} selected
              entries and update the cumulative sheet balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                bulkDeleteMutation.mutate(selectedIds);
              }}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
