// components/purchase-orders/create-po-dialog.tsx
'use client';

import { useState } from 'react';
import { Plus, Trash2, FileSpreadsheet, Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';

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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // 1. PT Info (Top Left)
  const [companyName, setCompanyName] = useState('PT PERDANA CIPTA KREASINDO');
  const [companyAddress, setCompanyAddress] = useState('The Icon Ritzone N7 No 36');
  const [companyCity, setCompanyCity] = useState('Tangerang Selatan');
  const [companyPhone, setCompanyPhone] = useState('+6281295006061');
  const [companyEmail, setCompanyEmail] = useState('ptperdanaciptakreasindo@gmail.com');

  // 2. Date & PO (Top Right)
  const [poNumber, setPoNumber] = useState(`PO/A${Math.floor(100 + Math.random() * 900)}/08/2026`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // 3. Vendor
  const [vendorName, setVendorName] = useState('');

  // 4. Ship To
  const [shipToAddress, setShipToAddress] = useState('Jl Lindungi Blok R.3 No 17, Teluk Gong, Jakarta Utara');
  const [shipToContact, setShipToContact] = useState('Bpk Ardi');
  const [shipToPhone, setShipToPhone] = useState('0857-1431-7510');

  // 5, 6, 7, 8. Items & Descriptions
  const [items, setItems] = useState<ItemRow[]>([
    { description: 'Borpile Diameter 30 meter\n- Pengecoran\n- Rakit Besi\n- Pengeboran', qty: '130', unitPrice: '374000' },
    { description: 'Buang Lumpur', qty: '', unitPrice: '' },
    { description: 'Bak Sirkulasi', qty: '', unitPrice: '' },
  ]);

  // 9. Notes
  const [notes, setNotes] = useState('');

  // 10. 4 Configurable Adjustment Blanks below Subtotal
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([
    { label: '', amount: '' },
    { label: '', amount: '' },
    { label: '', amount: '' },
    { label: '', amount: '' },
  ]);

  // 11. Signatures
  const [authorizerName, setAuthorizerName] = useState('RICHARD EDWIN GIOVANI');
  const [vendorSignerName, setVendorSignerName] = useState('NURYADI');

  const addItem = () => {
    setItems((prev) => [...prev, { description: '', qty: '', unitPrice: '' }]);
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

  const updateAdjustment = (idx: number, field: keyof AdjustmentRow, value: string) => {
    setAdjustments((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };

  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.unitPrice.replace(/\D/g, '')) || 0;
    return sum + qty * price;
  }, 0);

  const totalAdjustments = adjustments.reduce((sum, adj) => {
    const val = parseFloat(adj.amount.replace(/[^0-9.-]/g, '')) || 0;
    return sum + val;
  }, 0);

  const grandTotal = subtotal + totalAdjustments;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/purchase-orders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyAddress,
          companyCity,
          companyPhone,
          companyEmail,
          poNumber,
          date,
          vendorName,
          vendorSignerName,
          shipToAddress,
          shipToContact,
          shipToPhone,
          items: items.map((i) => ({
            description: i.description,
            qty: parseFloat(i.qty) || 0,
            unitPrice: parseFloat(i.unitPrice.replace(/\D/g, '')) || 0,
          })),
          notes,
          adjustments: adjustments.map((a) => ({
            label: a.label,
            amount: parseFloat(a.amount.replace(/[^0-9.-]/g, '')) || 0,
          })),
          authorizerName,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate PO');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${poNumber.replace(/\//g, '_')}_PO.xlsx`;
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error generating Purchase Order file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 text-xs font-semibold">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Buat Purchase Order
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92vh] w-[95%] max-w-4xl overflow-y-auto rounded-xl p-6 sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-50">
            <FileText className="h-5 w-5 text-emerald-600" />
            Purchase Order Generator
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleGenerate} className="mt-3 space-y-6 text-xs">
          {/* Top Section: PT Info & PO Number/Date */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-zinc-500">1. Data PT (Kiri Atas)</span>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nama PT" className="text-xs font-semibold" required />
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder="Alamat" className="text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} placeholder="Kota" className="text-xs" />
                <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="No Telpon" className="text-xs" />
              </div>
              <Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="Email" className="text-xs" />
            </div>

            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-zinc-500">2. No. PO & Tanggal (Kanan Atas)</span>
              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400">Nomor PO</label>
                <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO/A179/08/2026" className="text-xs font-semibold uppercase" required />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400">Tanggal PO</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-xs" required />
              </div>
            </div>
          </div>

          {/* Vendor & Ship To */}
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-emerald-600">3. VENDOR</span>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g. Bp. Nuryadi / Toko Besi" className="text-xs font-medium" required />
              <Input value={vendorSignerName} onChange={(e) => setVendorSignerName(e.target.value)} placeholder="Nama PIC Penandatangan Vendor (e.g. NURYADI)" className="text-xs" />
            </div>

            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-emerald-600">4. SHIP TO (Tujuan Pengiriman)</span>
              <Input value={shipToAddress} onChange={(e) => setShipToAddress(e.target.value)} placeholder="Alamat Proyek (e.g. Jl Lindungi Blok R.3 No 17)" className="text-xs" required />
              <div className="grid grid-cols-2 gap-2">
                <Input value={shipToContact} onChange={(e) => setShipToContact(e.target.value)} placeholder="PIC Penerima (e.g. Bpk Ardi)" className="text-xs" />
                <Input value={shipToPhone} onChange={(e) => setShipToPhone(e.target.value)} placeholder="Telp PIC Penerima" className="text-xs" />
              </div>
            </div>
          </div>

          {/* Items Section (Description, Qty, Unit Price, Total) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-zinc-500">5 - 8. Daftar Barang / Deskripsi Pekerjaan</span>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-7 gap-1 text-[11px]">
                <Plus className="h-3 w-3" /> Tambah Baris
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => {
                const lineTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice.replace(/\D/g, '')) || 0);
                return (
                  <div key={idx} className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-start">
                    <span className="mt-2 w-6 font-bold text-zinc-400">{idx + 1}.</span>
                    <textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Deskripsi barang / item pekerjaan..."
                      className="flex-1 rounded-md border border-zinc-200 bg-transparent p-2 text-xs focus:border-zinc-950 focus:outline-none dark:border-zinc-800"
                      required
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="QTY"
                        value={item.qty}
                        onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                        className="w-20 text-center text-xs"
                      />
                      <Input
                        placeholder="Harga Satuan (Rp)"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          updateItem(idx, 'unitPrice', raw ? new Intl.NumberFormat('id-ID').format(Number(raw)) : '');
                        }}
                        className="w-32 text-right text-xs font-semibold"
                      />
                      <div className="w-32 text-right font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {new Intl.NumberFormat('id-ID').format(lineTotal)}
                      </div>
                      <button type="button" onClick={() => removeItem(idx)} disabled={items.length <= 1} className="rounded p-1 text-zinc-400 hover:text-rose-600 disabled:opacity-25">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes & Subtotal / 4 Configurable Adjustments Section */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-zinc-500">9. Note / Catatan</span>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan (e.g. Pembayaran DP 50%, sisa setelah selesai)..."
                className="w-full rounded-md border border-zinc-200 bg-white p-2.5 text-xs focus:border-zinc-950 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
              />

              <div className="pt-3">
                <span className="font-bold uppercase tracking-wider text-zinc-500">11. Penandatangan PT (Kiri Bawah)</span>
                <Input value={authorizerName} onChange={(e) => setAuthorizerName(e.target.value)} placeholder="Nama Penandatangan PT" className="mt-1 text-xs font-semibold" />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="font-bold text-zinc-600 dark:text-zinc-300">SUBTOTAL</span>
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(subtotal)}
                </span>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                10. 4 Baris Penyesuaian (PPN, PPh, Diskon, Ongkir, dsb.)
              </span>

              {adjustments.map((adj, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Label ${idx + 1} (e.g. PPN 11% / Discount)`}
                    value={adj.label}
                    onChange={(e) => updateAdjustment(idx, 'label', e.target.value)}
                    className="flex-1 text-xs"
                  />
                  <Input
                    placeholder="Nominal (Rp)"
                    value={adj.amount}
                    onChange={(e) => updateAdjustment(idx, 'amount', e.target.value)}
                    className="w-36 text-right text-xs font-semibold"
                  />
                </div>
              ))}

              <div className="flex items-center justify-between rounded-md bg-blue-50 p-2.5 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 mt-3">
                <span className="font-bold text-blue-900 dark:text-blue-200">TOTAL AKHIR</span>
                <span className="font-mono text-sm font-bold text-blue-900 dark:text-blue-100">
                  Rp {new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full text-xs font-semibold py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating PO Excel...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Download Excel Purchase Order
              </span>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}