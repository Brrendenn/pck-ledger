'use client';

import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LedgerEntry } from './columns';

interface ExportButtonsProps {
  data: LedgerEntry[];
  sheetName: string;
}

export function ExportButtons({ data, sheetName }: ExportButtonsProps) {
  
  // Format the data to match your original Excel structure
  const getFormattedData = () => {
    return data.map((row) => ({
      Tanggal: new Date(row.date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      }).replace(/ /g, '-'),
      Kode: row.code,
      Keterangan: row.description,
      Debet: row.debit === 0 ? '-' : row.debit,
      Credit: row.credit === 0 ? '-' : row.credit,
      Saldo: row.saldo,
    }));
  };

  const exportToExcel = () => {
    const formattedData = getFormattedData();
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    
    // Auto-size columns for better readability
    worksheet['!cols'] = [
      { wch: 12 }, // Tanggal
      { wch: 8 },  // Kode
      { wch: 40 }, // Keterangan
      { wch: 15 }, // Debet
      { wch: 15 }, // Credit
      { wch: 15 }, // Saldo
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
    XLSX.writeFile(workbook, `${sheetName}_Export.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const formattedData = getFormattedData();
    
    // Extract headers and rows for jspdf-autotable
    const headers = [['Tanggal', 'Kode', 'Keterangan', 'Debet', 'Credit', 'Saldo']];
    const rows = formattedData.map(row => [
      row.Tanggal, 
      row.Kode, 
      row.Keterangan, 
      row.Debet.toLocaleString(), 
      row.Credit.toLocaleString(), 
      row.Saldo.toLocaleString()
    ]);

    doc.setFontSize(14);
    doc.text(`Project Ledger: ${sheetName}`, 40, 40);

    autoTable(doc, {
      startY: 50,
      head: headers,
      body: rows,
      theme: 'grid',
      styles: { fontSize: 9, font: 'helvetica' },
      headStyles: { fillColor: [63, 63, 70] }, // matches zinc-700
      columnStyles: {
        3: { halign: 'right' }, // Right-align money columns
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });

    doc.save(`${sheetName}_Export.pdf`);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
        <FileSpreadsheet className="h-4 w-4 text-green-600" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
        <FileText className="h-4 w-4 text-red-600" />
        PDF
      </Button>
    </div>
  );
}