// app/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet,
  ArrowRight,
  Layers,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

export default function GlobalDashboardPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["sidebar-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      </div>
    );
  }

  const projectList = projects || [];
  const totalSheets = projectList.reduce(
    (acc: number, p: any) => acc + (p.sheets?.length || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Portfolio Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
            Enterprise Financial Hub
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            PCK Project Portfolio
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Multi-project construction ledger management and expense allocation.
          </p>
        </div>

        <CreateProjectDialog />
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Active Projects
            </span>
            <div className="rounded-full bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {projectList.length}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Total registered client workbooks
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Total Sub-Sheets
            </span>
            <div className="rounded-full bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
            {totalSheets}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Master cashbooks and module sheets
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              System Status
            </span>
            <div className="rounded-full bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Supabase DB Synced
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Real-time ledger pipeline online
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Workbooks & Projects
        </h3>

        {projectList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
            <Building2 className="mx-auto h-8 w-8 text-zinc-400" />
            <h4 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No projects created yet
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              Get started by creating your first project ledger workbook.
            </p>
            <div className="mt-4 flex justify-center">
              <CreateProjectDialog />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectList.map((project: any) => (
              <div
                key={project.id}
                className="group flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {project.company}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {project.sheets?.length || 0} sheets
                    </span>
                  </div>

                  <h4 className="mt-3 text-base font-bold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-50">
                    {project.name}
                  </h4>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {project.sheets?.map((s: any) => (
                      <Link
                        key={s.id}
                        href={`/sheets/${s.id}`}
                        className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View Project Dashboard <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
