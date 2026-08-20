// components/ledger/ledger-stats.tsx
'use client';

import { ArrowDownLeft, ArrowUpRight, Wallet, ReceiptText, Calculator } from 'lucide-react';
import { LedgerEntry } from './columns';

interface LedgerStatsProps {
  data: LedgerEntry[];
  isExpenseOnly?: boolean;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);

export function LedgerStats({ data, isExpenseOnly = false }: LedgerStatsProps) {
  const totalDebit = data.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const totalCredit = data.reduce((acc, curr) => acc + (curr.credit || 0), 0);
  const currentSaldo = totalDebit - totalCredit;
  const count = data.length;
  const avgExpense = count > 0 ? totalCredit / count : 0;

  if (isExpenseOnly) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total Pengeluaran
            </span>
            <div className="rounded-full bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalCredit)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Akumulasi seluruh biaya modul</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Jumlah Transaksi
            </span>
            <div className="rounded-full bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <ReceiptText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {count} Entri
          </div>
          <p className="mt-1 text-xs text-zinc-500">Total catatan pengeluaran</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Rata-rata Pengeluaran
            </span>
            <div className="rounded-full bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatCurrency(avgExpense)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Rata-rata per catatan biaya</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Total Debet (In)
          </span>
          <div className="rounded-full bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatCurrency(totalDebit)}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Total incoming funds recorded</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Total Credit (Out)
          </span>
          <div className="rounded-full bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatCurrency(totalCredit)}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Total expenses disbursed</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Current Saldo
          </span>
          <div className="rounded-full bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div
          className={`mt-2 text-xl font-bold tabular-nums ${
            currentSaldo >= 0
              ? 'text-zinc-900 dark:text-zinc-50'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {formatCurrency(currentSaldo)}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Net remaining sheet balance</p>
      </div>
    </div>
  );
}