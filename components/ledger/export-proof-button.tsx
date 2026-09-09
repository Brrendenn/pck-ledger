// components/ledger/export-proof-button.tsx
"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportProofButtonProps {
  sheetId: string;
  sheetName: string;
  startDate?: string; // active date filter YYYY-MM-DD
  endDate?: string;
  selectedIds?: string[]; // selected row IDs, empty = all filtered
}

export function ExportProofButton({
  sheetId,
  sheetName,
  startDate,
  endDate,
  selectedIds,
}: ExportProofButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = { sheetId };

      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;
      if (selectedIds && selectedIds.length > 0) {
        payload.transactionIds = selectedIds;
      }

      const response = await fetch("/api/transactions/export-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error || `Export failed (${response.status})`
        );
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Build a clean filename
      const safeName = sheetName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const period = [startDate, endDate].filter(Boolean).join("_");
      a.download = period
        ? `Bukti_Transaksi_${safeName}_${period}.pdf`
        : `Bukti_Transaksi_${safeName}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to export proof";
      setError(message);
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={loading}
        className="gap-2"
        title="Export proof-of-transaction PDF with attachment images"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4 text-blue-600" />
        )}
        {loading ? "Generating..." : "Export Proof"}
      </Button>

      {error && (
        <div className="absolute top-full left-0 z-10 mt-1 max-w-xs rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
