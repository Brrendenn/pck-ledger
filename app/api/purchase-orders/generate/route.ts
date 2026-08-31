// app/api/purchase-orders/generate/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName = 'PT PERDANA CIPTA KREASINDO',
      companyAddress = 'The Icon Ritzone N7 No 36',
      companyCity = 'Tangerang Selatan',
      companyPhone = '+6281295006061',
      companyEmail = 'ptperdanaciptakreasindo@gmail.com',
      poNumber,
      date,
      vendorName,
      vendorSignerName,
      shipToAddress,
      shipToContact,
      shipToPhone,
      items = [],
      notes = '',
      adjustments = [], // Array of up to 4 custom lines: [{ label: 'PPN 11%', amount: 5348200 }, ...]
      authorizerName = 'RICHARD EDWIN GIOVANI',
    } = body;

    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'po-template.xlsx');

    let worksheet: ExcelJS.Worksheet;

    if (fs.existsSync(templatePath)) {
      // 1. If physical template file exists, read it
      await workbook.xlsx.readFile(templatePath);
      worksheet = workbook.worksheets[0];
    } else {
      // 2. Programmatically generate the exact template if file is not uploaded
      worksheet = workbook.addWorksheet('Purchase Order');
      worksheet.views = [{ showGridLines: true }];

      // Column Widths
      worksheet.columns = [
        { key: 'colA', width: 6 },
        { key: 'colB', width: 44 },
        { key: 'colC', width: 14 },
        { key: 'colD', width: 18 },
        { key: 'colE', width: 22 },
      ];
    }

    // Set Header Brand (Top Left)
    worksheet.getCell('A1').value = companyName;
    worksheet.getCell('A1').font = { name: 'Calibri', size: 12, bold: true };

    worksheet.getCell('A2').value = 'Alamat :';
    worksheet.getCell('B2').value = companyAddress;
    worksheet.getCell('A3').value = 'Kota :';
    worksheet.getCell('B3').value = companyCity;
    worksheet.getCell('A4').value = 'Telpon :';
    worksheet.getCell('B4').value = companyPhone;
    worksheet.getCell('A5').value = 'Email :';
    worksheet.getCell('B5').value = companyEmail;

    // Set Top Right Headers
    worksheet.getCell('E1').value = 'PURCHASE ORDER';
    worksheet.getCell('E1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF4D7C0F' } };
    worksheet.getCell('E1').alignment = { horizontal: 'right' };

    worksheet.getCell('D2').value = 'DATE';
    worksheet.getCell('E2').value = date;
    worksheet.getCell('D3').value = 'PO';
    worksheet.getCell('E3').value = poNumber;

    // Set Vendor & Ship To (Rows 7-11)
    worksheet.getCell('A7').value = 'VENDOR';
    worksheet.getCell('A7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4D7C0F' } };
    worksheet.getCell('A7').font = { color: { argb: 'FFFFFFFF' }, bold: true };

    worksheet.getCell('C7').value = 'SHIP TO';
    worksheet.getCell('C7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4D7C0F' } };
    worksheet.getCell('C7').font = { color: { argb: 'FFFFFFFF' }, bold: true };

    worksheet.getCell('A8').value = vendorName;
    worksheet.getCell('C8').value = shipToAddress;
    worksheet.getCell('C9').value = shipToContact;
    worksheet.getCell('C10').value = shipToPhone;

    // Table Column Headers (Row 13)
    const headerRow = 13;
    const headers = ['No.', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL'];
    headers.forEach((h, idx) => {
      const cell = worksheet.getRow(headerRow).getCell(idx + 1);
      cell.value = h;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4D7C0F' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: idx === 1 ? 'left' : 'center' };
    });

    // Populate Item Rows
    let currentRow = 14;
    let subtotal = 0;

    items.forEach((item: any, index: number) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const lineTotal = qty * unitPrice;
      subtotal += lineTotal;

      worksheet.getCell(`A${currentRow}`).value = index + 1;
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'top' };

      worksheet.getCell(`B${currentRow}`).value = item.description;
      worksheet.getCell(`B${currentRow}`).alignment = { wrapText: true, vertical: 'top' };

      worksheet.getCell(`C${currentRow}`).value = qty > 0 ? qty : '';
      worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center', vertical: 'top' };

      worksheet.getCell(`D${currentRow}`).value = unitPrice > 0 ? unitPrice : '';
      worksheet.getCell(`D${currentRow}`).numFmt = '#,##0.00';
      worksheet.getCell(`D${currentRow}`).alignment = { horizontal: 'right', vertical: 'top' };

      worksheet.getCell(`E${currentRow}`).value = lineTotal > 0 ? lineTotal : '';
      worksheet.getCell(`E${currentRow}`).numFmt = '#,##0.00';
      worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'right', vertical: 'top' };
      worksheet.getCell(`E${currentRow}`).font = { bold: true };

      currentRow++;
    });

    // Fill blank rows to ensure min height
    while (currentRow < 24) {
      worksheet.getCell(`A${currentRow}`).value = '';
      worksheet.getCell(`B${currentRow}`).value = '';
      worksheet.getCell(`C${currentRow}`).value = '';
      worksheet.getCell(`D${currentRow}`).value = '';
      worksheet.getCell(`E${currentRow}`).value = '';
      currentRow++;
    }

    // Notes Header & Body
    worksheet.getCell(`A${currentRow}`).value = 'Note :';
    worksheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4D4D8' } };
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`A${currentRow + 1}`).value = notes;

    // Subtotal Row
    worksheet.getCell(`D${currentRow}`).value = 'SUBTOTAL';
    worksheet.getCell(`D${currentRow}`).font = { bold: true };
    worksheet.getCell(`E${currentRow}`).value = subtotal;
    worksheet.getCell(`E${currentRow}`).numFmt = '#,##0.00';
    worksheet.getCell(`E${currentRow}`).font = { bold: true };

    // 4 Configurable Adjustment Rows (PPN, PPh, Discount, etc.)
    let grandTotal = subtotal;
    for (let i = 0; i < 4; i++) {
      const adj = adjustments[i];
      const adjRow = currentRow + 1 + i;

      if (adj && adj.label) {
        const val = Number(adj.amount) || 0;
        grandTotal += val;
        worksheet.getCell(`D${adjRow}`).value = adj.label;
        worksheet.getCell(`E${adjRow}`).value = val !== 0 ? val : '-';
        if (val !== 0) worksheet.getCell(`E${adjRow}`).numFmt = '#,##0.00';
      } else {
        worksheet.getCell(`D${adjRow}`).value = '';
        worksheet.getCell(`E${adjRow}`).value = '-';
      }
      worksheet.getCell(`E${adjRow}`).alignment = { horizontal: 'right' };
    }

    // Grand Total Row
    const totalRow = currentRow + 5;
    worksheet.getCell(`D${totalRow}`).value = 'TOTAL';
    worksheet.getCell(`D${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    worksheet.getCell(`D${totalRow}`).font = { bold: true };

    worksheet.getCell(`E${totalRow}`).value = grandTotal;
    worksheet.getCell(`E${totalRow}`).numFmt = '"Rp " #,##0.00';
    worksheet.getCell(`E${totalRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    worksheet.getCell(`E${totalRow}`).font = { bold: true };

    // Signatures Section (Bottom)
    const signRow = totalRow + 3;
    worksheet.getCell(`B${signRow}`).value = authorizerName.toUpperCase();
    worksheet.getCell(`B${signRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`B${signRow}`).font = { bold: true };

    worksheet.getCell(`D${signRow}`).value = (vendorSignerName || vendorName || '').toUpperCase();
    worksheet.getCell(`D${signRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`D${signRow}`).font = { bold: true };

    const signFooterRow = signRow + 4;
    worksheet.getCell(`B${signFooterRow}`).value = `(${authorizerName})`;
    worksheet.getCell(`B${signFooterRow}`).alignment = { horizontal: 'center' };

    worksheet.getCell(`D${signFooterRow}`).value = vendorSignerName
      ? `(${vendorSignerName})`
      : '(..................................)';
    worksheet.getCell(`D${signFooterRow}`).alignment = { horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${poNumber.replace(/\//g, '_')}_PO.xlsx"`,
      },
    });
  } catch (error) {
    console.error('PO Generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate Purchase Order' }, { status: 500 });
  }
}