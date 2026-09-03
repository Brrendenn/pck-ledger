// components/layout/mobile-nav.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import {
  Menu,
  X,
  Building2,
  FolderClosed,
  FolderOpen,
  FileSpreadsheet,
  LogOut,
  User as UserIcon,
  ChevronRight,
  LayoutDashboard,
  ReceiptText,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >({});
  const pathname = usePathname();
  const { data: session } = useSession();

  const isClient = (session?.user as any)?.role === "CLIENT";
  const assignedProjectId = (session?.user as any)?.assignedProjectId;

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const { data: projects = [] } = useQuery({
  queryKey: ["sidebar-projects"],
  queryFn: async () => {
    const res = await fetch("/api/projects");
    if (!res.ok) return [];
    return res.json();
  },
  enabled: pathname !== "/login" && Boolean(session?.user),
});

  const visibleProjects = isClient
    ? projects.filter((p: any) => p.id === assignedProjectId)
    : projects;

  const toggleProject = (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  if (pathname === "/login") return null;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              PCK Ledger
            </span>
            <span className="text-[10px] font-medium text-zinc-400">
              Financial Hub
            </span>
          </div>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="h-9 w-9 rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* 2. Isolated Fullscreen Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-out Menu */}
          <div className="relative z-10 flex h-full w-[85%] max-w-xs flex-col justify-between bg-white p-5 shadow-2xl transition-transform animate-in slide-in-from-left duration-200 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
            {/* Header & Navigation */}
            <div className="flex flex-col gap-5 overflow-y-auto pr-1">
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    PCK Workspace
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 3. Hide Portfolio Overview and Purchase Orders for Clients */}
              {!isClient && (
                <div className="space-y-1">
                  <Link
                    href="/"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      pathname === "/"
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Portfolio Overview</span>
                  </Link>

                  <Link
                    href="/purchase-orders"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      pathname.startsWith('/purchase-orders')
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                        : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <ReceiptText className="h-4 w-4 text-emerald-600" />
                    <span>Purchase Orders</span>
                  </Link>
                </div>
              )}

              {/* Projects & Workbooks Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {isClient ? "Your Project" : "Projects & Sheets"}
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800">
                    {visibleProjects.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {visibleProjects.map((project: any) => {
                    const isExpanded = expandedProjects[project.id] ?? true;
                    const isProjectActive =
                      pathname === `/projects/${project.id}`;

                    return (
                      <div
                        key={project.id}
                        className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-1.5 dark:border-zinc-800/80 dark:bg-zinc-900/40"
                      >
                        {/* Project Header Row */}
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/projects/${project.id}`}
                            className={`flex flex-1 items-center gap-2 truncate rounded-md px-2 py-1 text-xs font-semibold ${
                              isProjectActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            {isExpanded ? (
                              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            ) : (
                              <FolderClosed className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            )}
                            <span className="truncate">{project.name}</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => toggleProject(project.id, e)}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 transition-transform ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        </div>

                        {/* Nested Sheets List */}
                        {isExpanded && (
                          <div className="mt-1 space-y-0.5 border-l border-zinc-200 pl-2.5 ml-2 dark:border-zinc-800">
                            {project.sheets?.map((sheet: any) => {
                              const isSheetActive =
                                pathname === `/sheets/${sheet.id}`;
                              return (
                                <Link
                                  key={sheet.id}
                                  href={`/sheets/${sheet.id}`}
                                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors ${
                                    isSheetActive
                                      ? "bg-blue-600 font-semibold text-white"
                                      : "text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 opacity-75" />
                                    <span className="truncate">
                                      {sheet.name}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[9px] uppercase tracking-wider rounded px-1 py-0.2 ${
                                      isSheetActive
                                        ? "bg-blue-700 text-white"
                                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                    }`}
                                  >
                                    {sheet.type === "EXPENSE_ONLY"
                                      ? "EXP"
                                      : "KAS"}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 4. Hide Create Project Dialog for Clients */}
                {!isClient && (
                  <div className="pt-2">
                    <CreateProjectDialog />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Authenticated User Footer */}
            {session?.user && (
              <div className="border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {session.user.name || (isClient ? "Client" : "Admin")}
                      </p>
                      <p className="truncate text-[10px] text-zinc-400">
                        {session.user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}