// components/ledger/columns.tsx
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { EditableCell } from "./editable-cell";

export type LedgerEntry = {
  id: string;
  sheetId: string;
  date: Date;
  code: string;
  description: string;
  category?: string | null;
  debit: number;
  credit: number;
  saldo: number;
};

const formatAccounting = (amount: number) => {
  if (amount === 0) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

function RowActions({
  row,
  isExpenseOnly,
  availableCategories,
}: {
  row: LedgerEntry;
  isExpenseOnly: boolean;
  availableCategories: string[];
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete transaction");
      return res.json();
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: ["transactions", row.sheetId],
      });
      const previous = queryClient.getQueryData<LedgerEntry[]>([
        "transactions",
        row.sheetId,
      ]);

      if (previous) {
        queryClient.setQueryData<LedgerEntry[]>(
          ["transactions", row.sheetId],
          previous.filter((item) => item.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["transactions", row.sheetId],
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", row.sheetId],
      });
      setShowDeleteAlert(false);
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit Entry
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/50"
            onClick={() => setShowDeleteAlert(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Entry
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTransactionDialog
        transaction={row}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        isExpenseOnly={isExpenseOnly}
        availableCategories={availableCategories}
      />

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this entry ({row.description}) and
              update the cumulative balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(row.id);
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function getColumns(
  isExpenseOnly: boolean = false,
  availableCategories: string[] = [],
): ColumnDef<LedgerEntry>[] {
  const selectionColumn: ColumnDef<LedgerEntry> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };

  const baseColumns: ColumnDef<LedgerEntry>[] = [
    selectionColumn,
    {
      accessorKey: "date",
      header: "Tanggal",
      cell: ({ row }) => {
        const date = new Date(row.getValue("date"));
        return date
          .toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          })
          .replace(/ /g, "-");
      },
    },
    {
      accessorKey: "code",
      header: "Kode",
      cell: ({ row }) => (
        <EditableCell
          row={row.original}
          field="code"
          value={row.original.code}
        />
      ),
    },
    {
      accessorKey: "description",
      header: "Keterangan",
      cell: ({ row }) => (
        <div className="max-w-[320px] truncate font-medium text-zinc-900 dark:text-zinc-100">
          <EditableCell
            row={row.original}
            field="description"
            value={row.original.description}
          />
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Kategori",
      cell: ({ row }) => {
        const cat = row.getValue("category") as string | undefined;
        if (!cat) return <span className="text-zinc-400">-</span>;
        return (
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {cat}
          </span>
        );
      },
    },
  ];

  if (isExpenseOnly) {
    return [
      ...baseColumns,
      {
        accessorKey: "credit",
        header: () => <div className="text-right">Pengeluaran</div>,
        cell: ({ row }) => (
          <EditableCell
            row={row.original}
            field="credit"
            value={row.original.credit}
            isNumeric
            align="right"
          />
        ),
      },
      {
        accessorKey: "saldo",
        header: () => (
          <div className="text-right font-semibold">Total Pengeluaran</div>
        ),
        cell: ({ row }) => {
          const amount = parseFloat(row.getValue("saldo"));
          return (
            <div className="text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatAccounting(amount)}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-center w-8"></div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <RowActions
              row={row.original}
              isExpenseOnly={isExpenseOnly}
              availableCategories={availableCategories}
            />
          </div>
        ),
      },
    ];
  }

  return [
    ...baseColumns,
    {
      accessorKey: "debit",
      header: () => <div className="text-right">Debet</div>,
      cell: ({ row }) => (
        <EditableCell
          row={row.original}
          field="debit"
          value={row.original.debit}
          isNumeric
          align="right"
        />
      ),
    },
    {
      accessorKey: "credit",
      header: () => <div className="text-right">Credit</div>,
      cell: ({ row }) => (
        <EditableCell
          row={row.original}
          field="credit"
          value={row.original.credit}
          isNumeric
          align="right"
        />
      ),
    },
    {
      accessorKey: "saldo",
      header: () => <div className="text-right font-semibold">Saldo</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("saldo"));
        return (
          <div className="text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatAccounting(amount)}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center w-8"></div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <RowActions
            row={row.original}
            isExpenseOnly={isExpenseOnly}
            availableCategories={availableCategories}
          />
        </div>
      ),
    },
  ];
}
