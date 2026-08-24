// components/ledger/ledger-analytics.tsx
"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { LedgerEntry } from "./columns";

interface LedgerAnalyticsProps {
  data: LedgerEntry[];
  isExpenseOnly?: boolean;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#64748b",
];

const formatCompactNumber = (number: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

export function LedgerAnalytics({
  data,
  isExpenseOnly = false,
}: LedgerAnalyticsProps) {
  // 1. Spending by Category (Donut Chart)
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();

    data.forEach((item) => {
      const amount = Number(item.credit) || 0;
      if (amount > 0) {
        const cat = item.category?.trim() || "General / Uncategorized";
        map.set(cat, (map.get(cat) || 0) + amount);
      }
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // 2. Monthly Inflow vs Outflow (Bar Chart)
  const monthlyData = useMemo(() => {
    const map = new Map<
      string,
      { month: string; Inflow: number; Outflow: number }
    >();

    data.forEach((item) => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      });

      if (!map.has(key)) {
        map.set(key, { month: monthLabel, Inflow: 0, Outflow: 0 });
      }

      const entry = map.get(key)!;
      entry.Inflow += Number(item.debit) || 0;
      entry.Outflow += Number(item.credit) || 0;
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, val]) => val);
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Category Spending Donut Chart */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Expense Breakdown by Category
        </h4>
        <div className="mt-3 h-60 w-full">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [
                    formatCurrency(Number(val)),
                    "Total",
                  ]}
                  contentStyle={{
                    backgroundColor: "rgba(24, 24, 27, 0.95)",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              No expense records found.
            </div>
          )}
        </div>
      </div>

      {/* Monthly Cash Flow / Expense Trend */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {isExpenseOnly
            ? "Monthly Expense Trend"
            : "Monthly Cash Flow (In vs Out)"}
        </h4>
        <div className="mt-3 h-60 w-full">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.2}
                />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(val) => formatCompactNumber(val)}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val))]}
                  contentStyle={{
                    backgroundColor: "rgba(24, 24, 27, 0.95)",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                />
                {!isExpenseOnly && (
                  <Bar dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                )}
                <Bar dataKey="Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              No chronological data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
