// components/ledger/import-excel-button.tsx
"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { normalizeExcelDate } from "@/lib/date-utils";

interface ImportExcelButtonProps {
  sheetId: string;
}

export function ImportExcelButton({ sheetId }: ImportExcelButtonProps) {
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const bulkMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId, transactions: rows }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import transactions");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", sheetId] });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);

    try {
      const data = await file.arrayBuffer();
      // Parse workbook without auto-converting to local midnight dates
      const workbook = XLSX.read(data, {
        type: "array",
        cellDates: false, // Prevents automatic timezone degradation
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: "",
      });

      const parsedRows = jsonData
        .map((row) => {
          // Normalize header variations
          const rawDate = row.Tanggal || row.tanggal || row.Date || row.date;
          const rawCode = row.Kode || row.kode || row.Code || row.code || "MT";
          const rawDesc =
            row.Keterangan ||
            row.keterangan ||
            row.Description ||
            row.description;
          const rawCat =
            row.Kategori ||
            row.kategori ||
            row.Category ||
            row.category ||
            null;

          const rawDebit =
            row.Debet || row.debet || row.Debit || row.debit || 0;
          const rawCredit =
            row.Credit ||
            row.credit ||
            row.Kredit ||
            row.kredit ||
            row.Pengeluaran ||
            row.pengeluaran ||
            0;

          if (!rawDesc && !rawDebit && !rawCredit) return null;

          return {
            date: normalizeExcelDate(rawDate),
            code: String(rawCode).trim(),
            description: String(rawDesc || "").trim(),
            category: rawCat ? String(rawCat).trim() : null,
            debit:
              typeof rawDebit === "number"
                ? rawDebit
                : parseFloat(String(rawDebit).replace(/[^0-9.-]+/g, "")) || 0,
            credit:
              typeof rawCredit === "number"
                ? rawCredit
                : parseFloat(String(rawCredit).replace(/[^0-9.-]+/g, "")) || 0,
          };
        })
        .filter(Boolean);

      if (parsedRows.length === 0) {
        alert("No valid transaction rows found in this sheet.");
        return;
      }

      await bulkMutation.mutateAsync(parsedRows);
    } catch (err: any) {
      console.error("Import error:", err);
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const isLoading = isParsing || bulkMutation.isPending;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        disabled={isLoading}
        onClick={() => fileInputRef.current?.click()}
        className="gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        ) : (
          <Upload className="h-4 w-4 text-zinc-500" />
        )}
        {isLoading ? "Importing..." : "Import Excel"}
      </Button>
    </>
  );
}
