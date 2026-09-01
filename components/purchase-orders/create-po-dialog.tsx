// components/purchase-orders/create-po-dialog.tsx
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  Loader2,
  FileText,
  RefreshCw,
  Building,
  Calendar,
  Hash,
  MapPin,
  User,
  Phone,
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

interface ItemRow {
  description: string;
  qty: string;
  unitPrice: string;
}

interface AdjustmentRow {
  label: string;
  amount: string;
}

export function CreatePODialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: metaData, refetch: refetchMeta } = useQuery({
    queryKey: ["po-meta"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-orders/meta");
      if (!res.ok) throw new Error("Failed to load PO metadata");
      return res.json();
    },
  });

  const [companyName, setCompanyName] = useState("PT PERDANA CIPTA KREASINDO");
  const [poNumber, setPoNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorSignerName, setVendorSignerName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");
  const [shipToContact, setShipToContact] = useState("");
  const [shipToPhone, setShipToPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ItemRow[]>([
    { description: "", qty: "", unitPrice: "" },
  ]);

  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([
    { label: "", amount: "" },
    { label: "", amount: "" },
    { label: "", amount: "" },
    { label: "", amount: "" },
  ]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      refetchMeta().then((res) => {
        if (res.data?.nextPONumber) {
          setPoNumber(res.data.nextPONumber);
        }
      });
    }
  };

  const handleVendorSelect = (name: string) => {
    setVendorName(name);
    const found = metaData?.vendors?.find(
      (v: any) => v.name.toLowerCase() === name.toLowerCase(),
    );
    if (found) {
      if (found.address) setVendorAddress(found.address);
      if (found.signerName) setVendorSignerName(found.signerName);
    }
  };

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = metaData?.projects?.find((p: any) => p.id === projId);
    if (proj) {
      if (proj.location) setShipToAddress(proj.location);
      if (proj.contactName) setShipToContact(proj.contactName);
      if (proj.contactPhone) setShipToPhone(proj.contactPhone);
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, { description: "", qty: "", unitPrice: "" }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const updateAdjustment = (
    idx: number,
    field: keyof AdjustmentRow,
    value: string,
  ) => {
    setAdjustments((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.unitPrice.replace(/\D/g, "")) || 0;
    return sum + qty * price;
  }, 0);

  const totalAdjustments = adjustments.reduce((sum, adj) => {
    const val = parseFloat(adj.amount.replace(/[^0-9.-]/g, "")) || 0;
    return sum + val;
  }, 0);

  const grandTotal = subtotal + totalAdjustments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          poNumber,
          date,
          vendorName,
          vendorAddress,
          vendorSignerName,
          shipToAddress,
          shipToContact,
          shipToPhone,
          projectId: selectedProjectId || null,
          items: items.map((i) => ({
            description: i.description,
            qty: parseFloat(i.qty) || 0,
            unitPrice: parseFloat(i.unitPrice.replace(/\D/g, "")) || 0,
          })),
          notes,
          adjustments: adjustments.map((a) => ({
            label: a.label,
            amount: parseFloat(a.amount.replace(/[^0-9.-]/g, "")) || 0,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to create PO");

      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["po-meta"] });

      setOpen(false);

      // Reset form fields
      setVendorName("");
      setVendorAddress("");
      setVendorSignerName("");
      setShipToAddress("");
      setShipToContact("");
      setShipToPhone("");
      setSelectedProjectId("");
      setNotes("");
      setItems([{ description: "", qty: "", unitPrice: "" }]);
      setAdjustments([
        { label: "", amount: "" },
        { label: "", amount: "" },
        { label: "", amount: "" },
        { label: "", amount: "" },
      ]);
    } catch (err) {
      console.error(err);
      alert("Failed to save Purchase Order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-2 bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <FileSpreadsheet className="h-4 w-4" /> Buat Purchase Order
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] w-[95%] max-w-4xl overflow-y-auto rounded-2xl p-6 sm:w-full">
        <DialogHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Purchase Order Generator
              </DialogTitle>
              <p className="text-xs text-zinc-500">
                Buat dokumen PO resmi format PT. Perdana Cipta Kreasindo
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5 text-xs">
          {/* Section 1: Header Metadata (Vertical Stack) */}
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
                Nama PT / Perusahaan (Cell B2)
              </label>
              <div className="relative">
                <Building className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. PT PERDANA CIPTA KREASINDO"
                  className="h-9 pl-8 text-xs font-semibold uppercase"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
                    Nomor PO
                  </label>
                  {metaData?.latestPONumber &&
                    metaData.latestPONumber !== "-" && (
                      <span className="text-[10px] text-zinc-400">
                        (Terakhir:{" "}
                        <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                          {metaData.latestPONumber}
                        </span>
                        )
                      </span>
                    )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    refetchMeta().then((res) => {
                      if (res.data?.nextPONumber)
                        setPoNumber(res.data.nextPONumber);
                    });
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Next Sequenced
                </button>
              </div>
              <div className="relative">
                <Hash className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="PO/A191/08/2026"
                  className="h-9 pl-8 text-xs font-semibold uppercase"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">
                Tanggal PO
              </label>
              <div className="relative">
                <Calendar className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 pl-8 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Vendor & Ship To */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-2">
            {/* Vendor Details */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                  Vendor
                </span>
              </div>

              {/* 1. Vendor Name */}
              <div className="relative">
                <Building className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  list="vendor-list"
                  value={vendorName}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  placeholder="Nama Vendor / Perusahaan"
                  className="h-9 pl-8 text-xs font-medium"
                  required
                />
                <datalist id="vendor-list">
                  {(metaData?.vendors || []).map((v: any) => (
                    <option key={v.id} value={v.name}>
                      {v.address ? `${v.name} (${v.address})` : v.name}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* 2. Full Multi-line Vendor Address */}
              <div className="space-y-1">
                <textarea
                  rows={2}
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  placeholder="Alamat Lengkap Vendor (Jalan, Kelurahan, Kota, Kode Pos)"
                  className="w-full resize-y rounded-lg border border-zinc-200 bg-white p-2.5 text-xs leading-relaxed transition-colors focus:border-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-100"
                />
              </div>

              {/* 3. Optional PIC Signer Name Only */}
              <div className="relative">
                <User className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  value={vendorSignerName}
                  onChange={(e) => setVendorSignerName(e.target.value)}
                  placeholder="Nama PIC Penandatangan (Kosongkan jika tanda tangan basah)"
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>

            {/* Ship To Details */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                    Ship To (Tujuan Pengiriman)
                  </span>
                </div>

                {metaData?.projects?.length > 0 && (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-700 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    <option value="">-- Isi Otomatis Dari Proyek --</option>
                    {metaData.projects.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="relative">
                <MapPin className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  value={shipToAddress}
                  onChange={(e) => setShipToAddress(e.target.value)}
                  placeholder="Alamat Proyek (e.g. Jl Lindungi Blok R.3 No 17)"
                  className="h-9 pl-8 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    value={shipToContact}
                    onChange={(e) => setShipToContact(e.target.value)}
                    placeholder="PIC Penerima"
                    className="h-9 pl-8 text-xs"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute top-2.5 left-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    value={shipToPhone}
                    onChange={(e) => setShipToPhone(e.target.value)}
                    placeholder="No. Telepon"
                    className="h-9 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Material Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-300">
                  Daftar Barang / Pekerjaan
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {items.length} Baris
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="h-7 gap-1 px-2.5 text-[11px] font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Baris
              </Button>
            </div>

            <div className="hidden grid-cols-12 gap-2 px-3 text-[10px] font-bold tracking-wider text-zinc-400 uppercase sm:grid">
              <span className="col-span-6">Deskripsi Barang / Pekerjaan</span>
              <span className="col-span-2 text-center">QTY</span>
              <span className="col-span-2 text-right">Harga Satuan</span>
              <span className="col-span-2 text-right pr-7">Subtotal</span>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => {
                const lineTotal =
                  (parseFloat(item.qty) || 0) *
                  (parseFloat(item.unitPrice.replace(/\D/g, "")) || 0);
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-950 sm:grid sm:grid-cols-12 sm:items-start"
                  >
                    <div className="flex items-start gap-2 sm:col-span-6">
                      <span className="mt-2 w-5 font-mono text-[11px] font-semibold text-zinc-400">
                        {idx + 1}.
                      </span>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) =>
                          updateItem(idx, "description", e.target.value)
                        }
                        placeholder="Deskripsi barang / item pekerjaan..."
                        className="w-full resize-y rounded-lg border border-zinc-200 bg-transparent p-2 text-xs leading-relaxed transition-colors focus:border-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:focus:border-zinc-100"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2 sm:col-span-6 sm:justify-end">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)}
                        className="h-9 w-20 text-center text-xs tabular-nums"
                      />

                      <div className="relative w-36">
                        <span className="absolute top-2.5 left-2 text-[10px] font-semibold text-zinc-400">
                          Rp
                        </span>
                        <Input
                          placeholder="0"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            updateItem(
                              idx,
                              "unitPrice",
                              raw
                                ? new Intl.NumberFormat("id-ID").format(
                                    Number(raw),
                                  )
                                : "",
                            );
                          }}
                          className="h-9 pl-7 text-right text-xs font-semibold tabular-nums"
                        />
                      </div>

                      <div className="w-32 text-right font-mono text-xs font-bold text-zinc-900 tabular-nums dark:text-zinc-100">
                        {lineTotal > 0
                          ? new Intl.NumberFormat("id-ID").format(lineTotal)
                          : "-"}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Notes & Adjustments Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[11px] font-bold tracking-wider text-zinc-600 uppercase dark:text-zinc-400">
                Note / Catatan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan (e.g. Pembayaran DP 50%, pelunasan setelah selesai)..."
                className="w-full flex-1 min-h-40 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs leading-relaxed transition-colors focus:border-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-100"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                  Subtotal Barang
                </span>
                <span className="font-mono text-sm font-bold text-zinc-900 tabular-nums dark:text-zinc-100">
                  {new Intl.NumberFormat("id-ID", {
                    minimumFractionDigits: 2,
                  }).format(subtotal)}
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  4 Baris Penyesuaian (PPN, PPh, Diskon, Ongkir)
                </span>

                {adjustments.map((adj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Penyesuaian ${idx + 1} (e.g. PPN 11%, Diskon)`}
                      value={adj.label}
                      onChange={(e) =>
                        updateAdjustment(idx, "label", e.target.value)
                      }
                      className="h-8 flex-1 text-xs"
                    />
                    <div className="relative w-36">
                      <span className="absolute top-2 left-2 text-[10px] font-semibold text-zinc-400">
                        Rp
                      </span>
                      <Input
                        placeholder="0"
                        value={adj.amount}
                        onChange={(e) =>
                          updateAdjustment(idx, "amount", e.target.value)
                        }
                        className="h-8 pl-7 text-right text-xs font-semibold tabular-nums"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                <span className="font-bold text-emerald-900 uppercase dark:text-emerald-200">
                  Total Akhir
                </span>
                <span className="font-mono text-base font-bold text-emerald-900 tabular-nums dark:text-emerald-100">
                  Rp{" "}
                  {new Intl.NumberFormat("id-ID", {
                    minimumFractionDigits: 2,
                  }).format(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan Purchase
                Order...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" /> Simpan Purchase Order
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
