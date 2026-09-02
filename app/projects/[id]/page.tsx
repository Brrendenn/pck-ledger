// app/projects/[id]/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { CreateSheetDialog } from "@/components/ledger/create-new-sheet-dialog";
import { useSession } from 'next-auth/react';

interface ModuleChartItem {
  name: string;
  expense: number;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
];

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isClient = (session?.user as any)?.role === 'CLIENT';
  const projectId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["project-summary", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project summary");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-lg bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
        <div className="h-80 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const { project, stats, sheets, recentTransactions } = data;

  const moduleChartData: ModuleChartItem[] = (sheets || [])
    .filter((s: any) => (s.totalCredit || 0) > 0)
    .map((s: any) => ({
      name: s.category || s.name.replace("Pembukuan ", ""),
      expense: Number(s.totalCredit) || 0,
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* Project Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
            {project.company}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {project.name}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Consolidated financial overview and sub-module allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CreateSheetDialog projectId={projectId} />
          {sheets.length > 0 && (
            <Button
              onClick={() => router.push(`/sheets/${sheets[0].id}`)}
              className="gap-2 text-xs"
            >
              Open Active Sheet <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Cash Inflow */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total Kas (Debet)
            </span>
            <div className="rounded-full bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatCurrency(stats.totalInflow)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Master cash received</p>
        </div>

        {/* Total Cash Outflow */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total Pengeluaran (Credit)
            </span>
            <div className="rounded-full bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatCurrency(stats.totalOutflow)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Master cash disbursements
          </p>
        </div>

        {/* Net Master Saldo */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Saldo Kas
            </span>
            <div className="rounded-full bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-xl font-bold tabular-nums ${
              stats.netCashBalance >= 0
                ? "text-zinc-900 dark:text-zinc-50"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatCurrency(stats.netCashBalance)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Remaining liquid balance</p>
        </div>

        {/* Module Sub-Allocations */}
        {!isClient && (<div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Module Spend
            </span>
            <div className="rounded-full bg-purple-50 p-1.5 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatCurrency(stats.totalModuleExpenses)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Total recorded module costs
          </p>
        </div>)}
      </div>

      {/* Module Spend Breakdown Chart */}
      {moduleChartData.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Disbursements by Module & Category
              </h3>
              <p className="text-xs text-zinc-500">
                Cumulative expense distribution across all project sheets.
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </div>

          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={moduleChartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.2}
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) =>
                    new Intl.NumberFormat("id-ID", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(val)
                  }
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val: any) => [
                    formatCurrency(Number(val)),
                    "Total Expense",
                  ]}
                  contentStyle={{
                    backgroundColor: "rgba(24, 24, 27, 0.95)",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    color: "#ffffff",
                    fontWeight: "600",
                    marginBottom: "4px",
                  }}
                  itemStyle={{
                    color: "#ffffff",
                  }}
                />
                <Bar dataKey="expense" radius={[4, 4, 0, 0]}>
                  {moduleChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sheet Modules Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Project Sheets & Workbooks ({sheets.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet: any) => {
            const isExpenseOnly = sheet.type === "EXPENSE_ONLY";

            return (
              <Link
                key={sheet.id}
                href={`/sheets/${sheet.id}`}
                className="group flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-zinc-500 group-hover:text-blue-600" />
                      <h4 className="font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100">
                        {sheet.name}
                      </h4>
                    </div>

                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {isExpenseOnly ? "EXPENSE" : "MASTER KAS"}
                    </span>
                  </div>

                  {sheet.category && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Category Routing:{" "}
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        {sheet.category}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                      {isExpenseOnly ? "Total Expense" : "Running Saldo"}
                    </span>
                    <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(sheet.balance)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{sheet.transactionCount} entries</span>
                    {sheet.latestActivity && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(sheet.latestActivity).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                          },
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Cross-Sheet Activity Feed */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 p-4 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Cross-Sheet Activity
          </h3>
          <p className="text-xs text-zinc-500">
            Latest entries recorded across this project.
          </p>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {recentTransactions.map((tx: any) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3.5 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-zinc-400">
                  {new Date(tx.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {tx.code}
                </span>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {tx.description}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Sheet: {tx.sheetName}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {tx.debit > 0 && (
                  <div className="font-semibold tabular-nums text-emerald-600">
                    +{formatCurrency(tx.debit)}
                  </div>
                )}
                {tx.credit > 0 && (
                  <div className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    -{formatCurrency(tx.credit)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
