// components/layout/sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  Code2,
  Building2,
  ChevronDown,
  FolderClosed,
  FolderOpen,
  Trash2,
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

export function Sidebar() {
  const pathname = usePathname();
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

  const { data: projects } = useQuery({
    queryKey: ["sidebar-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      return res.json();
    },
  });

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
            <a href="/">PCK Ledger</a>
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span>Projects & Workbooks</span>
              <CreateProjectDialog />
            </div>

            <div className="mt-2 space-y-2">
              {projects?.map((project: any) => {
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
                        <button
                          type="button"
                          onClick={() => toggleProject(project.id)}
                          className="text-zinc-400 hover:text-zinc-600 p-0.5"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                              isCollapsed && "-rotate-90",
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
                                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
                                )}
                              >
                                <Link
                                  href={href}
                                  className="flex items-center gap-2 truncate flex-1"
                                >
                                  <FileSpreadsheet className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{sheet.name}</span>
                                </Link>

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

          <div>
            <div className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Developer Tools
            </div>
            <div className="mt-2 space-y-1">
              <Link
                href="/api-docs"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  pathname === "/api-docs"
                    ? "bg-zinc-200/80 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
                )}
              >
                <Code2 className="h-3.5 w-3.5" />
                API Explorer (Swagger)
              </Link>
            </div>
          </div>
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
