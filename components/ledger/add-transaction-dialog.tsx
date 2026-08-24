// components/ledger/add-transaction-dialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import * as z from "zod";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string(),
  debit: z.number().min(0),
  credit: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

export function AddTransactionDialog({ sheetId }: { sheetId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sheetData } = useQuery({
    queryKey: ["sheet", sheetId],
    queryFn: async () => {
      const res = await fetch(`/api/sheets/${sheetId}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const isExpenseOnly = sheetData?.type === "EXPENSE_ONLY";

  const availableCategories: string[] =
    sheetData?.project?.sheets
      ?.map((s: any) => s.category)
      .filter((c: any): c is string => Boolean(c)) || [];

  // components/ledger/add-transaction-dialog.tsx
  // Update the mutation block inside AddTransactionDialog:
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          debit: isExpenseOnly ? 0 : values.debit,
          category: values.category || null,
          sheetId,
        }),
      });
      if (!response.ok) throw new Error("Failed to create transaction");
      return response.json();
    },
    onMutate: async (newEntry: FormValues) => {
      await queryClient.cancelQueries({ queryKey: ["transactions", sheetId] });
      const previous = queryClient.getQueryData<any[]>([
        "transactions",
        sheetId,
      ]);

      if (previous) {
        const optimisticRow = {
          id: `temp-${Date.now()}`,
          sheetId,
          date: new Date(newEntry.date),
          code: newEntry.code,
          description: newEntry.description,
          category: newEntry.category || null,
          debit: isExpenseOnly ? 0 : Number(newEntry.debit),
          credit: Number(newEntry.credit),
          saldo: 0,
        };
        queryClient.setQueryData<any[]>(
          ["transactions", sheetId],
          [...previous, optimisticRow],
        );
      }

      return { previous };
    },
    onError: (_err, _newEntry, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["transactions", sheetId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", sheetId] });
      setOpen(false);
      form.reset();
    },
  });

  const form = useForm({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      code: "MT",
      description: "",
      category: "",
      debit: 0,
      credit: 0,
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-112.5">
        <DialogHeader>
          <DialogTitle>
            {isExpenseOnly ? "New Expense Entry" : "New Transaction"}
          </DialogTitle>
          <DialogDescription>
            {isExpenseOnly
              ? "Record a project module expense."
              : "Record a cash transaction. Select a category to auto-route expenses to module sheets."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <form.Field
              name="date"
              children={(field) => (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            />

            <form.Field
              name="code"
              children={(field) => (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Code
                  </label>
                  <Input
                    placeholder="MT, UM, UP"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            />
          </div>

          <form.Field
            name="description"
            children={(field) => (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <Input
                  placeholder="Material (Cat Mowilex)..."
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />

          {/* Show category routing dropdown only on master Debit/Credit sheets */}
          {!isExpenseOnly && availableCategories.length > 0 && (
            <form.Field
              name="category"
              children={(field) => (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Expense Category (Module Routing)
                  </label>
                  <select
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="">
                      -- No Category (Direct to Current Sheet) --
                    </option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
          )}

          {/* Dynamic Amount Inputs */}
          {isExpenseOnly ? (
            <form.Field
              name="credit"
              children={(field) => (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Amount / Pengeluaran (Rp)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              )}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="debit"
                children={(field) => (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Debit (Pemasukan)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                )}
              />

              <form.Field
                name="credit"
                children={(field) => (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Credit (Pengeluaran)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                )}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
