// components/ledger/import-excel-button.tsx
'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportExcelButtonProps {
  sheetId: string;
}

const cleanNumber = (val: any): number => {
  if (val === undefined || val === null || val === '' || val === '-') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const findKey = (row: Record<string, any>, possibleKeys: string[]) => {
  const keys = Object.keys(row);
  for (const candidate of possibleKeys) {
    const found = keys.find((k) => k.trim().toLowerCase() === candidate.toLowerCase());
    if (found !== undefined) return row[found];
  }
  return undefined;
};

export function ImportExcelButton({ sheetId }: ImportExcelButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (transactions: any[]) => {
      const response = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId, transactions }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ? JSON.stringify(data.error) : 'Bulk import failed');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', sheetId] });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsProcessing(false);
      alert(`Successfully imported ${data.count} transactions!`);
    },
    onError: (err: any) => {
      console.error('Import error:', err);
      alert(`Import failed: ${err.message}`);
      setIsProcessing(false);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
        });

        const parsedData = rawRows
          .map((row) => {
            const dateVal = findKey(row, ['Tanggal', 'Tgl', 'Date', 'Waktu']);
            const codeVal = findKey(row, ['Kode', 'Code', 'Kd']);
            const descVal = findKey(row, ['Keterangan', 'Deskripsi', 'Description', 'Uraian', 'Item']);
            const catVal = findKey(row, ['Kategori', 'Category', 'Kat']);
            const debitVal = findKey(row, ['Debet', 'Debit', 'Masuk', 'In', 'Inflow']);
            const creditVal = findKey(row, ['Credit', 'Kredit', 'Keluar', 'Out', 'Outflow', 'Biaya', 'Pengeluaran']);

            const rawDate = dateVal ? new Date(dateVal) : new Date();
            const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;

            return {
              date: validDate.toISOString().split('T')[0],
              code: codeVal ? String(codeVal).trim() : 'MT',
              description: descVal ? String(descVal).trim() : '',
              category: catVal ? String(catVal).trim() : null,
              debit: cleanNumber(debitVal),
              credit: cleanNumber(creditVal),
            };
          })
          .filter((row) => row.description.length > 0);

        if (parsedData.length === 0) {
          alert('Could not find valid rows. Ensure your spreadsheet contains columns like Tanggal, Keterangan, Debet, and Credit.');
          setIsProcessing(false);
          return;
        }

        mutation.mutate(parsedData);
      } catch (err) {
        console.error('File parsing error:', err);
        alert('Failed to read the file. Ensure it is a valid .xlsx or .csv spreadsheet.');
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={handleFileUpload}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={isProcessing || mutation.isPending}
        onClick={() => fileInputRef.current?.click()}
        className="gap-2"
      >
        <Upload className="h-4 w-4 text-blue-600" />
        {isProcessing || mutation.isPending ? 'Importing...' : 'Import'}
      </Button>
    </>
  );
}