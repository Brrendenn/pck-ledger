"use client";

import { ColumnDef } from "@tanstack/react-table";

// This matches the combined data from our API
export type LedgerEntry = {
  id: string;
  date: Date;
  code: string;
  description: string;
  debit: number;
  credit: number;
  saldo: number; // dynamically calculated from the API
};

// Utility to format numbers exactly like your Excel sheet
const formatAccounting = (amount: number) => {
  if (amount === 0) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const columns: ColumnDef<LedgerEntry>[] = [
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
        .replace(/ /g, "-"); // e.g., 5-Aug-26
    },
  },
  {
    accessorKey: "code",
    header: "Kode",
    cell: ({ row }) => (
      <div className="font-medium text-zinc-600 dark:text-zinc-400">
        {row.getValue("code")}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: "Keterangan",
    cell: ({ row }) => (
      <div className="max-w-75 truncate">{row.getValue("description")}</div>
    ),
  },
  {
    accessorKey: "debit",
    header: () => <div className="text-right">Debet</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("debit"));
      return (
        <div className="text-right font-medium tabular-nums">
          {formatAccounting(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "credit",
    header: () => <div className="text-right">Credit</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("credit"));
      return (
        <div className="text-right font-medium tabular-nums">
          {formatAccounting(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "saldo",
    header: () => <div className="text-right font-semibold">Saldo</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("saldo"));
      return (
        <div className="text-right font-semibold tabular-nums">
          {formatAccounting(amount)}
        </div>
      );
    },
  },
];
