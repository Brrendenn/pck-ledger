// app/sheets/[sheetId]/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { DataTable } from '@/components/ledger/data-table';
import { getColumns } from '@/components/ledger/columns';
import { AddTransactionDialog } from '@/components/ledger/add-transaction-dialog';
import { ExportButtons } from '@/components/ledger/export-buttons';
import { ImportExcelButton } from '@/components/ledger/import-excel-button';
import { SheetTabs } from '@/components/ledger/sheet-tabs';
import { LedgerStats } from '@/components/ledger/ledger-stats';

export default function LedgerPage() {
  const params = useParams();
  const sheetId = params.sheetId as string;

  const { data: sheetData, isLoading: isSheetLoading } = useQuery({
    queryKey: ['sheet', sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/sheets/${sheetId}`);
      if (!res.ok) throw new Error('Failed to load sheet metadata');
      return res.json();
    },
  });

  const { data: transactions, isLoading: isTxLoading } = useQuery({
    queryKey: ['transactions', sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?sheetId=${sheetId}`);
      if (!res.ok) throw new Error('Failed to fetch ledger data');
      return res.json();
    },
  });

  if (isSheetLoading || isTxLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-100 w-full rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    );
  }

  const project = sheetData?.project;
  const sheets = project?.sheets || [];
  const isExpenseOnly = sheetData?.type === 'EXPENSE_ONLY';
  const tableColumns = getColumns(isExpenseOnly);

  return (
    <div className="flex flex-col gap-6">
      {/* Title Header */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold tracking-wider uppercase text-zinc-500">
          {project?.company || 'PT. PCK'}
        </h2>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {project?.name || 'PROJECT PABRIK KONGKIE'}
        </h1>
      </div>

      {/* Summary KPI Cards */}
      <LedgerStats data={transactions || []} isExpenseOnly={isExpenseOnly} />

      {/* Workbook Tab & Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <SheetTabs sheets={sheets} projectId={project?.id} />

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {sheetData?.name || 'Ledger'}
              </h3>
              <p className="text-xs text-zinc-500">
                {isExpenseOnly
                  ? 'Module Expense Sheet (Cumulative Sum)'
                  : 'Master Cash Ledger (Debit & Credit)'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ImportExcelButton sheetId={sheetId} />
              <ExportButtons data={transactions || []} sheetName={sheetData?.name || 'Ledger'} />
              <AddTransactionDialog sheetId={sheetId} />
            </div>
          </div>

          <DataTable columns={tableColumns} data={transactions || []} />
        </div>
      </div>
    </div>
  );
}