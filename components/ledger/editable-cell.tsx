// components/ledger/editable-cell.tsx
"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { LedgerEntry } from "./columns";

interface EditableCellProps {
  row: LedgerEntry;
  field: "description" | "code" | "debit" | "credit";
  value: string | number;
  align?: "left" | "right";
  isNumeric?: boolean;
}

export function EditableCell({
  row,
  field,
  value: initialValue,
  align = "left",
  isNumeric = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const queryClient = useQueryClient();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const mutation = useMutation({
    mutationFn: async (newValue: string | number) => {
      const parsedValue = isNumeric
        ? Number(newValue) || 0
        : String(newValue).trim();
      const res = await fetch(`/api/transactions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsedValue }),
      });
      if (!res.ok) throw new Error("Failed to update field");
      return res.json();
    },
    onMutate: async (newValue) => {
      await queryClient.cancelQueries({
        queryKey: ["transactions", row.sheetId],
      });
      const previous = queryClient.getQueryData<LedgerEntry[]>([
        "transactions",
        row.sheetId,
      ]);

      if (previous) {
        queryClient.setQueryData<LedgerEntry[]>(
          ["transactions", row.sheetId],
          previous.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  [field]: isNumeric ? Number(newValue) || 0 : newValue,
                }
              : item,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _val, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["transactions", row.sheetId],
          context.previous,
        );
      }
      setValue(initialValue);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", row.sheetId],
      });
    },
  });

  const handleSave = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      mutation.mutate(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type={isNumeric ? "number" : "text"}
        value={value}
        step={isNumeric ? "0.01" : undefined}
        autoFocus
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onChange={(e) =>
          setValue(isNumeric ? parseFloat(e.target.value) || 0 : e.target.value)
        }
        className={cn(
          "w-full rounded border border-blue-500 bg-white px-1.5 py-0.5 text-xs font-normal text-zinc-900 outline-none shadow-sm dark:bg-zinc-900 dark:text-zinc-100",
          align === "right" && "text-right",
        )}
      />
    );
  }

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      title="Double click to edit inline"
      className={cn(
        "cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/60",
        align === "right" && "text-right",
      )}
    >
      {isNumeric
        ? Number(initialValue) === 0
          ? "-"
          : new Intl.NumberFormat("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(initialValue))
        : initialValue || "-"}
    </div>
  );
}
