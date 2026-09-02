// components/ledger/create-sheet-dialog.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CreateSheetDialogProps {
  projectId: string;
}

export function CreateSheetDialog({ projectId }: CreateSheetDialogProps) {
  const { data: session } = useSession();
  const isClient = (session?.user as any)?.role === 'CLIENT';

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'EXPENSE_ONLY' | 'DEBIT_CREDIT'>('EXPENSE_ONLY');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: category || null,
          projectId,
          type,
        }),
      });
      if (!res.ok) throw new Error('Failed to create sheet');
      return res.json();
    },
    onSuccess: (newSheet) => {
      queryClient.invalidateQueries({ queryKey: ['sheet'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      setOpen(false);
      setName('');
      setCategory('');
      router.push(`/sheets/${newSheet.id}`);
    },
  });

  // Automatically hide the button if the user is a Client
  if (isClient) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 ml-1">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>Add Ledger Sheet</DialogTitle>
          <DialogDescription>
            Add a module expense sheet (e.g. Pembukuan Gardu) and link a category.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Sheet Name</label>
            <Input
              placeholder="e.g. Pembukuan Gardu Listrik"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Category Identifier <span className="text-zinc-400 font-normal">(Used for automated expense routing)</span>
            </label>
            <Input
              placeholder="e.g. Gardu, Mess, Cool Storage"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Sheet Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="EXPENSE_ONLY">Expense Only (Sub-Module)</option>
              <option value="DEBIT_CREDIT">Debit & Credit (Master Kas)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding...' : 'Add Sheet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}