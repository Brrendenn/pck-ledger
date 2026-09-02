// components/ledger/sheet-tabs.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MoreVertical, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { CreateSheetDialog } from './create-new-sheet-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface SheetItem {
  id: string;
  name: string;
  type: 'EXPENSE_ONLY' | 'DEBIT_CREDIT';
}

interface SheetTabsProps {
  sheets: SheetItem[];
  projectId: string;
  isReadOnly?: boolean;
}

// 1. Add isReadOnly = false here
export function SheetTabs({ sheets, projectId, isReadOnly = false }: SheetTabsProps) {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentSheetId = params.sheetId as string;

  const [sheetToDelete, setSheetToDelete] = useState<SheetItem | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sheets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete sheet');
      return res.json();
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      queryClient.invalidateQueries({ queryKey: ['sheet'] });

      if (deletedId === currentSheetId) {
        const remaining = sheets.filter((s) => s.id !== deletedId);
        if (remaining.length > 0) {
          router.replace(`/sheets/${remaining[0].id}`);
        } else {
          router.replace('/');
        }
      }
      setSheetToDelete(null);
    },
  });

  return (
    <>
      <div className="flex items-center border-b border-zinc-200 bg-zinc-50/50 px-2 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {sheets.map((sheet) => {
            const isActive = sheet.id === currentSheetId;
            return (
              <div
                key={sheet.id}
                className={cn(
                  'group flex items-center gap-1 rounded-t-md border-b-2 px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-zinc-900 bg-white text-zinc-900 shadow-sm dark:border-zinc-100 dark:bg-zinc-950 dark:text-zinc-50'
                    : 'border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                )}
              >
                <Link href={`/sheets/${sheet.id}`} className="py-0.5">
                  {sheet.name}
                </Link>

                {/* 2. Hide Sheet Delete Menu if isReadOnly */}
                {!isReadOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-800"
                      >
                        <MoreVertical className="h-3 w-3 text-zinc-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/50"
                        onClick={() => setSheetToDelete(sheet)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Sheet
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>

        {/* 3. Hide Create Sheet Tab Button if isReadOnly */}
        {!isReadOnly && projectId && <CreateSheetDialog projectId={projectId} />}
      </div>

      <AlertDialog
        open={Boolean(sheetToDelete)}
        onOpenChange={(open) => !open && setSheetToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sheet "{sheetToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this entire sheet and all of its recorded transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (sheetToDelete) deleteMutation.mutate(sheetToDelete.id);
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Sheet'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}