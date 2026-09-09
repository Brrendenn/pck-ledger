// app/invoices/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Search,
  FileSpreadsheet,
  Trash2,
  Loader2,
  Receipt,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateInvoiceDialog } from "@/components/invoice/create-invoice-dialog";
import { generateInvoiceExcel } from "@/lib/fill-invoice-template";
import { AttachmentDialog } from "@/components/attachments";

const formatNumber = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(val);

export default function InvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "authenticated" && !isAdmin) {
      router.replace("/");
    }
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, isAdmin, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices-list"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Gagal memuat daftar invoice");
      return res.json();
    },
    enabled: status === "authenticated" && isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus invoice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
    },
  });

  const invoices: any[] = data?.invoices ?? [];
  const nextSequence: number = data?.nextSequence ?? 146;

  // Filter pencarian berdasarkan nomor invoice, perusahaan penerima, dan deskripsi
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const query = searchQuery.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNo?.toLowerCase().includes(query) ||
        inv.recipientComp?.toLowerCase().includes(query) ||
        inv.recipientAttn?.toLowerCase().includes(query) ||
        inv.description?.toLowerCase().includes(query),
    );
  }, [invoices, searchQuery]);

  const handleDownload = async (inv: any) => {
    try {
      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo: inv.invoiceNo,
          recipientComp: inv.recipientComp,
          recipientAttn: inv.recipientAttn,
          projectTitle: inv.projectTitle,
          description: inv.description,
          qty: inv.qty,
          unit: inv.unit,
          price: Number(inv.price),
          accountNumber: inv.accountNumber,
          accountName: inv.accountName,
          date: inv.date,
        }),
      });

      if (!res.ok) throw new Error("Failed to download invoice");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${inv.invoiceNo.replace(/[\/\\:]/g, "-")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Gagal mengunduh file invoice.");
    }
  };

  const handleDelete = (id: string, invoiceNo: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus invoice ${invoiceNo}?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (status === "loading" || !isAdmin) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-24 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
          <div className="h-28 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
        </div>
        <div className="h-96 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Invoices
            </h1>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Buat, arsipkan, dan ekspor faktur penagihan resmi proyek.
          </p>
        </div>

        <CreateInvoiceDialog
          existingInvoiceCount={nextSequence - 1}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
          }}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-xs font-medium text-zinc-500">
            Total Invoices
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {invoices.length}
            </span>
            <span className="text-xs text-zinc-400">Invoice Tercatat</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-xs font-medium text-zinc-500">
            Format Template
          </span>
          <div className="mt-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Excel Master (.xlsx)
          </div>
        </div>
      </div>

      {/* Table Container Card */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number, vendor, or project..."
            className="h-10 w-full rounded-xl border-zinc-200/90 pl-10 text-xs shadow-none placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400 dark:border-zinc-800"
          />
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:border-zinc-800">
                <th className="pb-3 pl-2 pr-4 font-semibold">NO. INVOICE</th>
                <th className="pb-3 px-4 font-semibold">TANGGAL</th>
                <th className="pb-3 px-4 font-semibold">PENERIMA (SHIP TO)</th>
                <th className="pb-3 px-4 font-semibold">ITEMS</th>
                <th className="pb-3 px-4 font-semibold">TOTAL (RP)</th>
                <th className="pb-3 pl-4 pr-2 text-right font-semibold">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="h-32 text-center text-zinc-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      <span>Memuat data invoice...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-32 text-center text-zinc-400">
                    Tidak ada invoice ditemukan.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="group transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40"
                  >
                    <td className="py-4 pl-2 pr-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(inv.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-4 px-4 max-w-65">
                      <div className="truncate font-semibold text-zinc-800 dark:text-zinc-200">
                        {inv.recipientComp}
                      </div>
                      <div className="truncate text-[11px] text-zinc-400">
                        {inv.recipientAttn}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {Number(inv.qty) || 1} baris
                    </td>
                    <td className="py-4 px-4 font-bold tabular-nums text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                      {formatNumber(Number(inv.totalAmount))}
                    </td>
                    <td className="py-4 pl-4 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AttachmentDialog
                          entityId={inv.id}
                          entityType="invoice"
                          entityLabel={inv.invoiceNo}
                          triggerSize="sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(inv)}
                          className="h-8 gap-1.5 rounded-lg border-zinc-200 px-3 text-[11px] font-medium text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:border-zinc-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                          Download Excel
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(inv.id, inv.invoiceNo)}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 p-0 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
