// components/ledger/edit-transaction-dialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LedgerEntry } from "./columns";

const editFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string(),
  debit: z.number().min(0),
  credit: z.number().min(0),
});

interface EditTransactionDialogProps {
  transaction: LedgerEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCategories?: string[];
  isExpenseOnly?: boolean;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  availableCategories = [],
  isExpenseOnly = false,
}: EditTransactionDialogProps) {
  const queryClient = useQueryClient();

  const formattedDate = transaction.date
    ? new Date(transaction.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof editFormSchema>) => {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          category: values.category || null,
          debit: isExpenseOnly ? 0 : values.debit,
        }),
      });

      if (!response.ok) throw new Error("Failed to update transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", transaction.sheetId],
      });
      onOpenChange(false);
    },
  });

  const form = useForm({
    defaultValues: {
      date: formattedDate,
      code: transaction.code || "MT",
      description: transaction.description || "",
      category: transaction.category || "",
      debit: Number(transaction.debit) || 0,
      credit: Number(transaction.credit) || 0,
    },
    validators: {
      onSubmit: editFormSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-112.5">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the transaction details. Balances will recalculate
            automatically.
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
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />

          {!isExpenseOnly && availableCategories.length > 0 && (
            <form.Field
              name="category"
              children={(field) => (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Category Tag
                  </label>
                  <select
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <option value="">-- No Category --</option>
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

          {isExpenseOnly ? (
            <form.Field
              name="credit"
              children={(field) => (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Amount / Pengeluaran
                  </label>
                  <Input
                    type="number"
                    step="0.01"
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
                      Debit (In)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
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
                      Credit (Out)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
