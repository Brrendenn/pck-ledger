// components/invoice/create-invoice-dialog.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateInvoiceExcel } from "@/lib/fill-invoice-template";
import { generateInvoiceNumber, formatInvoiceDate } from "@/lib/invoice-utils";

interface CreateInvoiceDialogProps {
  existingInvoiceCount?: number;
  onSuccess?: () => void | Promise<unknown>;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

export function CreateInvoiceDialog({
  existingInvoiceCount = 145,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Metadata
  const [invoiceNo, setInvoiceNo] = useState("");
  const [todayDate, setTodayDate] = useState("");

  // Recipient (To)
  const [toCompany, setToCompany] = useState("");
  const [toAttn, setToAttn] = useState("");
  const [projectTitle, setProjectTitle] = useState("DP 30% Pekerjaan Catwalk WTP PT GIST");

  // Rincian Item Tagihan
  const [description, setDescription] = useState(
    "Pek. Catwalk WTP & Railing Pengaman\n- Hollow besi 50x100x3mm\n- Plat 6mm besi\n- Plat 10mm besi\n- Expanded Metal GM50075"
  );
  
  // Qty sebagai Free Text
  const [qty, setQty] = useState("30%");
  const [price, setPrice] = useState("260000000");

  // Pilihan Rekening
  const [accountNumber, setAccountNumber] = useState("4799900022");
  const [accountName, setAccountName] = useState("PT. PCK");

  useEffect(() => {
    if (open) {
      setInvoiceNo(generateInvoiceNumber(existingInvoiceCount + 1));
      setTodayDate(formatInvoiceDate(new Date()));
    }
  }, [open, existingInvoiceCount]);

  // Kalkulasi total otomatis berdasarkan nilai Qty (persen / angka biasa)
  const calculatedTotal = useMemo(() => {
    const numPrice = Number(price) || 0;
    const cleanQty = qty.trim();

    if (cleanQty.endsWith("%")) {
      const pct = parseFloat(cleanQty.replace("%", ""));
      return isNaN(pct) ? 0 : (pct / 100) * numPrice;
    }

    const num = parseFloat(cleanQty);
    return isNaN(num) ? numPrice : num * numPrice;
  }, [qty, price]);

  const handleAccountNumberChange = (val: string) => {
    setAccountNumber(val);
    if (val === "4790272990") {
      setAccountName("Richard Edwin Giovani S");
    } else if (val === "4799900022") {
      setAccountName("PT. PCK");
    }
  };

  const handleExport = async () => {
    try {
      setIsSubmitting(true);
      const numPrice = Number(price) || 0;

      // 1. Simpan ke database
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo,
          recipientComp: toCompany,
          recipientAttn: toAttn,
          projectTitle,
          description,
          qty,
          price: numPrice,
          accountNumber,
          accountName,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan invoice ke database");
      }

      // 2. Tulis data ke template Excel & download
      await generateInvoiceExcel({
        invoiceNo,
        to: {
          company: toCompany,
          attn: toAttn,
        },
        accountNumber,
        accountName,
        projectTitle,
        items: [
          {
            no: 1,
            description,
            qty,
            price: numPrice,
            amount: calculatedTotal,
          },
        ],
      });

      onSuccess?.();
      setOpen(false);
    } catch (error) {
      console.error("Gagal membuat invoice:", error);
      alert("Terjadi kesalahan saat memproses invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9 gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700">
          <FileText className="h-4 w-4" />
          Buat Invoice
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Form Pembuatan Invoice Baru
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Metadata Otomatis */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-medium text-zinc-500">Nomor Invoice</label>
              <Input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-zinc-500">Tanggal</label>
              <Input
                value={todayDate}
                disabled
                className="h-8 bg-zinc-50 text-xs dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Penerima */}
          <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Tujuan Penagihan (To)
            </span>
            <div className="space-y-2">
              <Input
                placeholder="Perusahaan (misal: PT. GIST)"
                value={toCompany}
                onChange={(e) => setToCompany(e.target.value)}
                className="h-8 bg-white text-xs dark:bg-zinc-950"
                required
              />
              <Input
                placeholder="Up. / Attn (misal: Bpk William)"
                value={toAttn}
                onChange={(e) => setToAttn(e.target.value)}
                className="h-8 bg-white text-xs dark:bg-zinc-950"
                required
              />
            </div>
          </div>

          {/* Rincian Item */}
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="font-medium text-zinc-500">Judul / Footer Lingkup Proyek</label>
              <Input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-zinc-500">Deskripsi & Spesifikasi Pekerjaan</label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs font-mono leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-zinc-500">Qty (Bebas Teks)</label>
                <Input
                  type="text"
                  placeholder="misal: 30%, 1, atau 1 Lot"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-zinc-500">Harga Satuan / Nilai Kontrak</label>
                <Input
                  type="number"
                  placeholder="260000000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-8 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Preview Total */}
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
              <span>Total Tagihan (Amount):</span>
              <span className="font-mono text-sm">{formatCurrency(calculatedTotal)}</span>
            </div>
          </div>

          {/* Rekening */}
          <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Rekening Tujuan
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500">No. Rekening</label>
                <select
                  value={accountNumber}
                  onChange={(e) => handleAccountNumberChange(e.target.value)}
                  className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="4799900022">4799900022</option>
                  <option value="4790272990">4790272990</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-500">Atas Nama</label>
                <select
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="PT. PCK">PT. PCK</option>
                  <option value="Richard Edwin Giovani S">Richard Edwin Giovani S</option>
                </select>
              </div>
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={!toCompany.trim() || isSubmitting}
            className="w-full gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memproses & Mengunduh...
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5" />
                Simpan & Download Excel (.xlsx)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}