// components/ledger/download-template-button.tsx
"use client";

import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadTemplateButtonProps {
  sheetName: string;
  isExpenseOnly?: boolean;
}

export function DownloadTemplateButton({
  sheetName,
  isExpenseOnly = false,
}: DownloadTemplateButtonProps) {
  const handleDownload = () => {
    const today = new Date().toISOString().split("T")[0];

    // Pre-populate sample rows to guide the user
    const sampleData = isExpenseOnly
      ? [
          {
            Tanggal: today,
            Kode: "MT",
            Keterangan: "Beli Cat Mowilex 5 Galon",
            Kategori: "Gardu",
            Pengeluaran: 750000,
          },
          {
            Tanggal: today,
            Kode: "UP",
            Keterangan: "Upah Tukang Las (3 Orang)",
            Kategori: "Gardu",
            Pengeluaran: 450000,
          },
        ]
      : [
          {
            Tanggal: today,
            Kode: "UM",
            Keterangan: "Uang Masuk Termin 1",
            Kategori: "",
            Debet: 25000000,
            Credit: 0,
          },
          {
            Tanggal: today,
            Kode: "MT",
            Keterangan: "Material Besi Hollow 4x4",
            Kategori: "Gardu",
            Debet: 0,
            Credit: 3200000,
          },
          {
            Tanggal: today,
            Kode: "OP",
            Keterangan: "Beli Konsumsi & Air Mineral",
            Kategori: "",
            Debet: 0,
            Credit: 120000,
          },
        ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();

    // Auto-fit column widths for clear visibility
    worksheet["!cols"] = isExpenseOnly
      ? [
          { wch: 14 }, // Tanggal
          { wch: 8 }, // Kode
          { wch: 35 }, // Keterangan
          { wch: 16 }, // Kategori
          { wch: 16 }, // Pengeluaran
        ]
      : [
          { wch: 14 }, // Tanggal
          { wch: 8 }, // Kode
          { wch: 35 }, // Keterangan
          { wch: 16 }, // Kategori
          { wch: 16 }, // Debet
          { wch: 16 }, // Credit
        ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, `Template_${sheetName.replace(/\s+/g, "_")}.xlsx`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      className="gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <Download className="h-4 w-4 text-zinc-500" />
      Template
    </Button>
  );
}
