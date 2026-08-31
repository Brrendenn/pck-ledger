// app/purchase-orders/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Download,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  ReceiptText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreatePODialog } from '@/components/purchase-orders/create-po-dialog';

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await fetch('/api/purchase-orders');
      if (!res.ok) throw new Error('Failed to fetch PO list');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchase-orders?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete PO');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const filteredPOs = purchaseOrders.filter((po: any) => {
    const term = search.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(term) ||
      po.vendorName.toLowerCase().includes(term) ||
      po.projectLocation.toLowerCase().includes(term) ||
      po.project?.name?.toLowerCase().includes(term)
    );
  });

  const totalValue = purchaseOrders.reduce(
    (acc: number, po: any) => acc + (Number(po.totalAmount) || 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Purchase Orders
            </h1>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Generate, archive, and export official project material procurement orders.
          </p>
        </div>

        <CreatePODialog />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-xs font-semibold text-zinc-500">Total Purchase Orders</span>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {purchaseOrders.length} <span className="text-xs font-normal text-zinc-400">PO Issued</span>
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-xs font-semibold text-zinc-500">Total Nilai Pengadaan</span>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(totalValue)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-xs font-semibold text-zinc-500">Format Template</span>
          <p className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Standard PT. PCK (.xlsx)
          </p>
        </div>
      </div>

      {/* Filter & Table Container */}
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by PO number, vendor, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3">No. PO</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Tujuan (Ship To)</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Total (Rp)</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    Loading Purchase Orders...
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po: any) => (
                  <tr key={po.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {po.poNumber}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(po.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                      {po.vendorName}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-zinc-500" title={po.projectLocation}>
                      {po.projectLocation}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {po.items?.length || 0} baris
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {new Intl.NumberFormat('id-ID').format(po.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Delete this purchase order record?')) {
                              deleteMutation.mutate(po.id);
                            }
                          }}
                          className="rounded p-1 text-zinc-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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