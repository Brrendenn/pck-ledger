// components/layout/sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Code2,
  Building2,
  ChevronDown,
  FolderClosed,
  FolderOpen,
  Trash2,
  FileSpreadsheet,
  ReceiptText,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
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
import { signOut, useSession } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();
  if (pathname === "/login") {
    return null;
  }
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collapsedProjects, setCollapsedProjects] = useState<
    Record<string, boolean>
  >({});
  const [sheetToDelete, setSheetToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: session } = useSession();
  
  // 1. Role and Project Assignment Check
  const isClient = (session?.user as any)?.role === "CLIENT";
  const assignedProjectId = (session?.user as any)?.assignedProjectId;

  const { data: projects = [] } = useQuery({
  queryKey: ["sidebar-projects"],
  queryFn: async () => {
    const res = await fetch("/api/projects");
    if (!res.ok) return [];
    return res.json();
  },
  enabled: pathname !== "/login" && Boolean(session?.user),
});

  // 2. Filter projects if user is a Client
  const visibleProjects = isClient
    ? projects.filter((p: any) => p.id === assignedProjectId)
    : projects;

  const deleteSheetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sheets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete sheet");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sidebar-projects"] });
      queryClient.invalidateQueries({ queryKey: ["sheet"] });

      if (
        data.projectDeleted ||
        pathname === `/sheets/${data.deletedSheetId}`
      ) {
        router.replace("/");
      }
      setSheetToDelete(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sidebar-projects"] });
      queryClient.invalidateQueries({ queryKey: ["sheet"] });
      router.replace("/");
      setProjectToDelete(null);
    },
  });

  const toggleProject = (projectId: string) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  return (
    <>
      <div className="flex h-screen w-64 flex-col border-r border-zinc-200 bg-zinc-50/50 px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Building2 className="h-5 w-5 text-zinc-800 dark:text-zinc-200" />
          <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Link href="/">PCK Ledger</Link>
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span>{isClient ? "Your Project" : "Projects & Workbooks"}</span>
              {/* 3. Hide Create Project Button for Clients */}
              {!isClient && <CreateProjectDialog />}
            </div>

            {/* 4. Hide Purchase Orders Link for Clients */}
            {!isClient && (
              <div className="space-y-1 mt-2">
                <Link
                  href="/purchase-orders"
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    pathname.startsWith("/purchase-orders")
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  }`}
                >
                  <ReceiptText className="h-4 w-4 text-emerald-600" />
                  <span>Purchase Orders</span>
                </Link>
              </div>
            )}

            {/* User Profile Footer */}
            {session?.user && (
              <div className="border-t border-zinc-200 pt-4 mt-3 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      <UserIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {session.user.name || "User"}
                      </p>
                      <p className="truncate text-[10px] text-zinc-400">
                        {session.user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    title="Sign out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Project List */}
            <div className="mt-4 space-y-2">
              {visibleProjects?.map((project: any) => {
                const isCollapsed = Boolean(collapsedProjects[project.id]);

                return (
                  <div key={project.id} className="group/project space-y-1">
                    <div className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50">
                      <Link
                        href={`/projects/${project.id}`}
                        className="flex items-center gap-2 truncate text-left text-xs font-semibold text-zinc-800 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-blue-400 flex-1"
                      >
                        {isCollapsed ? (
                          <FolderClosed className="h-4 w-4 shrink-0 text-zinc-400" />
                        ) : (
                          <FolderOpen className="h-4 w-4 shrink-0 text-zinc-500" />
                        )}
                        <span className="truncate">{project.name}</span>
                      </Link>

                      <div className="flex items-center gap-1">
                        {/* 5. Hide Delete Project Button for Clients */}
                        {!isClient && (
                          <button
                            type="button"
                            onClick={() =>
                              setProjectToDelete({
                                id: project.id,
                                name: project.name,
                              })
                            }
                            className="opacity-0 transition-opacity hover:text-red-600 group-hover/project:opacity-100 p-0.5"
                            title="Delete Project"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleProject(project.id)}
                          className="text-zinc-400 hover:text-zinc-600 p-0.5"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                              isCollapsed && "-rotate-90"
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="ml-3 space-y-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                        {project.sheets?.length === 0 ? (
                          <div className="py-1 px-2 text-[11px] text-zinc-400 italic">
                            No sheets available
                          </div>
                        ) : (
                          project.sheets?.map((sheet: any) => {
                            const href = `/sheets/${sheet.id}`;
                            const isActive = pathname === href;

                            return (
                              <div
                                key={sheet.id}
                                className={cn(
                                  "group flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                                  isActive
                                    ? "bg-zinc-200/80 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                                )}
                              >
                                <Link
                                  href={href}
                                  className="flex items-center gap-2 truncate flex-1"
                                >
                                  <FileSpreadsheet className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{sheet.name}</span>
                                </Link>

                                {/* 6. Hide Delete Sheet Button for Clients */}
                                {!isClient && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSheetToDelete({
                                        id: sheet.id,
                                        name: sheet.name,
                                      })
                                    }
                                    className="opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!isClient && process.env.NODE_ENV !== "production" && (
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Developer
              </p>
              <Link
                href="/api-docs"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>API Documentation</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete Sheet Dialog */}
      <AlertDialog
        open={Boolean(sheetToDelete)}
        onOpenChange={(open) => !open && setSheetToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Sheet "{sheetToDelete?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sheet and all associated
              transactions. If this is the last sheet, the parent project will
              also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSheetMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (sheetToDelete) deleteSheetMutation.mutate(sheetToDelete.id);
              }}
              disabled={deleteSheetMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSheetMutation.isPending ? "Deleting..." : "Delete Sheet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Dialog */}
      <AlertDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Project "{projectToDelete?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project, all of its sheets, and
              all recorded transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProjectMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (projectToDelete)
                  deleteProjectMutation.mutate(projectToDelete.id);
              }}
              disabled={deleteProjectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteProjectMutation.isPending
                ? "Deleting..."
                : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}