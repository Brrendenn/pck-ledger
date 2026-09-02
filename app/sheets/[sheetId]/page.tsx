// app/sheets/[sheetId]/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { BarChart3, Plus } from "lucide-react";
import { DataTable } from "@/components/ledger/data-table";
import { getColumns } from "@/components/ledger/columns";
import { AddTransactionDialog } from "@/components/ledger/add-transaction-dialog";
import { DownloadTemplateButton } from "@/components/ledger/download-template-button";
import { ImportExcelButton } from "@/components/ledger/import-excel-button";
import { SheetTabs } from "@/components/ledger/sheet-tabs";
import { LedgerStats } from "@/components/ledger/ledger-stats";
import { LedgerAnalytics } from "@/components/ledger/ledger-analytics";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function LedgerPage() {
  const { data: session } = useSession();
  const isClient = (session?.user as any)?.role === "CLIENT";
  const params = useParams();
  const sheetId = params.sheetId as string;
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: sheetData, isLoading: isSheetLoading } = useQuery({
    queryKey: ["sheet", sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/sheets/${sheetId}`);
      if (!res.ok) throw new Error("Failed to load sheet metadata");
      return res.json();
    },
  });

  const { data: transactions, isLoading: isTxLoading } = useQuery({
    queryKey: ["transactions", sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?sheetId=${sheetId}`);
      if (!res.ok) throw new Error("Failed to fetch ledger data");
      return res.json();
    },
  });

  const isExpenseOnly = sheetData?.type === "EXPENSE_ONLY";

  // Calculate sequential running balance (saldo) for each row
  const safeTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];

    let currentBalance = 0;
    return transactions.map((t: any) => {
      const debit = Number(t.debit) || 0;
      const credit = Number(t.credit) || 0;

      if (isExpenseOnly) {
        currentBalance += credit;
      } else {
        currentBalance += debit - credit;
      }

      return {
        ...t,
        debit,
        credit,
        saldo: currentBalance,
      };
    });
  }, [transactions, isExpenseOnly]);

  const project = sheetData?.project;
  const sheets = project?.sheets || [];

  const availableCategories: string[] = useMemo(() => {
    return sheets
      .map((s: any) => s.category)
      .filter((c: any): c is string => Boolean(c));
  }, [sheets]);

  // Filter out the action column (edit/delete) if the user is a client
  const tableColumns = useMemo(() => {
    const rawColumns = getColumns(isExpenseOnly, availableCategories);
    if (isClient) {
      return rawColumns.filter(
        (col: any) => col.id !== "actions" && col.id !== "select"
      );
    }
    return rawColumns;
  }, [isExpenseOnly, availableCategories, isClient]);

  if (isSheetLoading || isTxLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-100 w-full rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title Header */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div>
          <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
            {project?.company || "PT. PCK"}
          </h2>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {project?.name || "PROJECT LEDGER"}
          </h1>
        </div>

        <Button
          variant={showAnalytics ? "default" : "outline"}
          size="sm"
          onClick={() => setShowAnalytics((prev) => !prev)}
          className="gap-2 text-xs"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          {showAnalytics ? "Hide Charts" : "Show Analytics"}
        </Button>
      </div>

      {/* Visual Analytics Charts */}
      {showAnalytics && (
        <LedgerAnalytics
          data={safeTransactions}
          isExpenseOnly={isExpenseOnly}
        />
      )}

      {/* Summary KPI Cards */}
      <LedgerStats data={safeTransactions} isExpenseOnly={isExpenseOnly} />

      {/* Workbook Container */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* Pass isReadOnly so client cannot add new sheet tabs */}
        <SheetTabs
          sheets={sheets}
          projectId={project?.id}
          isReadOnly={isClient}
        />

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {sheetData?.name || "Ledger"}
              </h3>
              <p className="text-xs text-zinc-500">
                {isExpenseOnly
                  ? "Module Expense Sheet (Cumulative Sum)"
                  : "Master Cash Ledger (Debit & Credit)"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Export / Template button stays visible for client */}
              <DownloadTemplateButton
                sheetName={sheetData?.name || "Ledger"}
                isExpenseOnly={isExpenseOnly}
              />

              {/* Admin-only action controls */}
              {!isClient && (
                <>
                  <ImportExcelButton sheetId={sheetId} />
                  <AddTransactionDialog
                    sheetId={sheetId}
                    sheetType={sheetData?.type}
                    defaultCategory={sheetData?.category}
                  />
                </>
              )}
            </div>
          </div>

          <DataTable
            columns={tableColumns}
            data={safeTransactions}
            sheetId={sheetId}
            sheetName={sheetData?.name || "Ledger"}
          />
        </div>
      </div>

      {/* Floating Action Button (Mobile Only - Admin Only) */}
      {!isClient && (
        <div className="fixed bottom-6 right-6 z-40 lg:hidden">
          <AddTransactionDialog
            sheetId={sheetId}
            sheetType={sheetData?.type}
            defaultCategory={sheetData?.category}
            triggerButton={
              <Button
                size="icon"
                className="h-14 w-14 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:scale-95"
              >
                <Plus className="h-6 w-6" />
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}