// components/ledger/add-transaction-dialog.tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddTransactionDialogProps {
  sheetId: string;
  sheetType?: "EXPENSE_ONLY" | "DEBIT_CREDIT";
  defaultCategory?: string | null;
  triggerButton?: React.ReactNode;
}

const TRANSACTION_CODES = [
  "MT",
  "UP",
  "OGK",
  "BS",
  "KOP",
  "MKN",
  "LST",
  "SEW",
  "OTH",
];

export function AddTransactionDialog({
  sheetId,
  sheetType = "DEBIT_CREDIT",
  defaultCategory = null,
  triggerButton,
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [code, setCode] = useState("MT");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultCategory || "");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", sheetId] });
      queryClient.invalidateQueries({ queryKey: ["project-summary"] });
      setOpen(false);
      setDescription("");
      setAmount("");
      setError("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numericAmount = parseFloat(amount.replace(/[^0-9]/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    mutation.mutate({
      sheetId,
      date: `${date}T12:00:00.000Z`,
      code,
      description,
      category: category.trim() || null,
      debit:
        sheetType === "EXPENSE_ONLY" ? 0 : type === "DEBIT" ? numericAmount : 0,
      credit:
        sheetType === "EXPENSE_ONLY"
          ? numericAmount
          : type === "CREDIT"
            ? numericAmount
            : 0,
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setAmount("");
      return;
    }
    setAmount(new Intl.NumberFormat("id-ID").format(Number(raw)));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="sm" className="gap-1.5 text-xs font-semibold">
            <Plus className="h-4 w-4" /> Add Transaction
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] w-[92%] max-w-md overflow-y-auto rounded-xl p-5 sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            {sheetType === "EXPENSE_ONLY"
              ? "Record Expense"
              : "Add Cash Transaction"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-rose-50 p-2.5 text-xs text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          {/* Type Selector (Only if Master Kas) */}
          {sheetType === "DEBIT_CREDIT" && (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setType("CREDIT")}
                className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  type === "CREDIT"
                    ? "bg-white text-rose-600 shadow-sm dark:bg-zinc-800 dark:text-rose-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Pengeluaran (Credit)
              </button>
              <button
                type="button"
                onClick={() => setType("DEBIT")}
                className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  type === "DEBIT"
                    ? "bg-white text-emerald-600 shadow-sm dark:bg-zinc-800 dark:text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Pemasukan (Debet)
              </button>
            </div>
          )}

          {/* Amount Field with Mobile NumPad Trigger */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Nominal (Rp)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                className="pl-9 text-base font-semibold tabular-nums sm:text-sm"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Date & Code Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Tanggal
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-8 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Kode
              </label>
              <select
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-900 focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                {TRANSACTION_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Keterangan
            </label>
            <div className="relative">
              <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="e.g. Pembelian Semen Padang"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="pl-8 text-xs"
                required
              />
            </div>
          </div>

          {/* Category Tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Kategori / Sub-Module (Optional)
            </label>
            <div className="relative">
              <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="e.g. Besi, Utilitas, Operasional"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full text-xs font-semibold py-2.5"
          >
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </span>
            ) : (
              "Save Entry"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
