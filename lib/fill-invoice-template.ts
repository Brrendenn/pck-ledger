// lib/fill-invoice-template.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { formatInvoiceDate } from "./invoice-utils";

export interface InvoiceItem {
  no: number;
  description: string;
  qty: string;
  unit?: string;
  price: number;
  amount: number;
}

export interface GenerateInvoiceParams {
  invoiceNo: string;
  to: {
    company: string;
    attn: string;
  };
  accountNumber: string;
  accountName: string;
  projectTitle: string;
  items: InvoiceItem[];
}

export async function generateInvoiceExcel(data: GenerateInvoiceParams) {
  const todayFormatted = formatInvoiceDate(new Date());

  // Fetch with cache-busting timestamp
  const response = await fetch(
    `/templates/invoice-template.xlsx?v=${new Date().getTime()}`,
  );
  if (!response.ok) throw new Error("Template not found.");

  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet =
    workbook.getWorksheet("Invoice Template") || workbook.worksheets[0];

  // 1. Metadata
  worksheet.getCell("L2").value = data.invoiceNo;
  worksheet.getCell("L3").value = todayFormatted;

  // 2. Recipient Info (To)
  worksheet.getCell("L7").value = data.to.company;
  worksheet.getCell("L8").value = data.to.attn;
  worksheet.getCell("L7").font = { name: "Calibri", size: 11 };
  worksheet.getCell("L8").font = { name: "Calibri", size: 11 };

  // Note: Sender info ("From") is removed here.
  // It is best to just type "Richard Edwin Giovani" directly into your blank Excel file and save it to avoid the giant font glitch.

  // 3. Populate Rows
  const startRow = 12;
  let totalCalculated = 0;

  data.items.forEach((item, index) => {
    const currentRow = startRow + index;
    const row = worksheet.getRow(currentRow);

    // No
    row.getCell("B").value = item.no;
    row.getCell("B").alignment = { horizontal: "center", vertical: "top" };

    // Item Description (Write directly to C, it is already merged to H)
    const descCell = row.getCell("C");
    descCell.value = item.description;
    descCell.alignment = { wrapText: true, vertical: "top" };
    descCell.font = { name: "Calibri", size: 11 };

    // Qty
    row.getCell("I").value = item.qty;
    row.getCell("I").alignment = { horizontal: "center", vertical: "top" };
    row.getCell("I").font = { name: "Calibri", size: 11 };

    // Unit
    row.getCell("J").value = item.unit || "Fee";
    row.getCell("J").alignment = { horizontal: "center", vertical: "top" };
    row.getCell("J").font = { name: "Calibri", size: 11 };

    // Price (Write directly to K, it is already merged to L)
    const priceCell = row.getCell("K");
    priceCell.value = item.price;
    priceCell.numFmt = '"Rp"\\ #,##0';
    priceCell.alignment = { horizontal: "right", vertical: "top" };
    priceCell.font = { name: "Calibri", size: 11 };

    // Amount (Write directly to M, it is already merged to N)
    const amountCell = row.getCell("M");
    amountCell.value = item.amount;
    amountCell.numFmt = '"Rp"\\ #,##0';
    amountCell.alignment = { horizontal: "right", vertical: "top" };
    amountCell.font = { name: "Calibri", size: 11 };

    totalCalculated += item.amount;
  });

  // 4. Project Scope Footer
  const scopeCell = worksheet.getCell("B18");
  scopeCell.value = data.projectTitle;
  scopeCell.font = { name: "Calibri", size: 11, bold: true };
  scopeCell.alignment = { horizontal: "center", vertical: "middle" };

  // 5. Total Amount
  const totalCell = worksheet.getCell("M20");
  totalCell.value = totalCalculated;
  totalCell.numFmt = '"Rp"\\ #,##0';

  // 6. Payment Details
  worksheet.getCell("D23").value = "BANK BCA";
  worksheet.getCell("D24").value = data.accountNumber;
  worksheet.getCell("D25").value = data.accountName;
  ["D23", "D24", "D25"].forEach((cell) => {
    worksheet.getCell(cell).font = { name: "Calibri", size: 11 };
    worksheet.getCell(cell).alignment = { horizontal: "left" };
  });

  // 7. Signer Date
  worksheet.getCell("L21").value = `Jakarta, ${todayFormatted}`;
  worksheet.getCell("L21").font = { name: "Calibri", size: 11 };

  // Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `Invoice-${data.invoiceNo.replace(/[\/\\:]/g, "-")}.xlsx`);
}
