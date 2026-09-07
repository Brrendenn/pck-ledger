// lib/fill-invoice-template.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { formatInvoiceDate } from "./invoice-utils";

export interface InvoiceItem {
  no: number;
  description: string;
  qty: string;
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
  const FROM_NAME = "Richard Edwin Giovani";
  const FROM_EMAIL = "richard_giovani75@yahoo.co.id";
  const FROM_PHONE = "0816 1127 145";
  const todayFormatted = formatInvoiceDate(new Date());

  // 1. Ambil template mentah
  const response = await fetch("/templates/invoice-template.xlsx");
  if (!response.ok) {
    throw new Error("File template invoice tidak ditemukan di /public/templates/invoice-template.xlsx");
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Sheet tidak ditemukan di template.");

  // 2. Metadata Invoice (Baris 3 & 4)
  // Kolom M adalah kotak isian di sebelah kanan tanda titik dua (:)
  worksheet.getCell("M3").value = data.invoiceNo;
  worksheet.getCell("M4").value = todayFormatted;

  // 3. Data Pengirim (From) - Baris 8, 9, 10
  worksheet.getCell("D8").value = FROM_NAME;
  worksheet.getCell("D9").value = FROM_EMAIL;
  worksheet.getCell("D10").value = FROM_PHONE;

  // 4. Data Penerima (To) - Baris 8 & 9
  // Perusahaan di baris 8, Nama PIC/Attn di baris 9
  worksheet.getCell("J8").value = data.to.company;
  worksheet.getCell("J9").value = data.to.attn;

  // 5. Isi Baris Tabel Pekerjaan (Mulai dari Baris 13)
  const startRow = 13;
  let totalCalculated = 0;

  data.items.forEach((item, index) => {
    const currentRow = startRow + index;
    const row = worksheet.getRow(currentRow);

    // Kolom B: Nomor urut
    row.getCell("B").value = item.no;
    row.getCell("B").alignment = { horizontal: "center", vertical: "top" };

    // Kolom C: Deskripsi pekerjaan (C13 adalah master cell dari merge C13:G13)
    const descCell = row.getCell("C");
    descCell.value = item.description;
    descCell.alignment = { wrapText: true, vertical: "top" };

    // Kolom H: Qty (misal: "30%")
    const qtyCell = row.getCell("H");
    qtyCell.value = item.qty;
    qtyCell.alignment = { horizontal: "center", vertical: "middle" };

    // Kolom K: Price / Nilai Kontrak
    const priceCell = row.getCell("K");
    priceCell.value = item.price;
    priceCell.numFmt = '"Rp"\\ #,##0';
    priceCell.alignment = { horizontal: "right", vertical: "middle" };

    // Kolom M: Amount / Hasil perkalian
    const amountCell = row.getCell("M");
    amountCell.value = item.amount;
    amountCell.numFmt = '"Rp"\\ #,##0';
    amountCell.alignment = { horizontal: "right", vertical: "middle" };

    totalCalculated += item.amount;
  });

  // 6. Lingkup Pekerjaan & Total Amount Bawah
  worksheet.getCell("B19").value = data.projectTitle;
  
  const totalCell = worksheet.getCell("M20");
  totalCell.value = totalCalculated;
  totalCell.numFmt = '"Rp"\\ #,##0';

  // 7. Rekening Pembayaran (Baris 23, 24, 25)
  worksheet.getCell("D23").value = "BANK BCA";
  worksheet.getCell("D24").value = data.accountNumber;
  worksheet.getCell("D25").value = data.accountName;

  // 8. Tanggal Tanda Tangan (Di atas stempel materai)
  worksheet.getCell("K22").value = `Jakarta, ${todayFormatted}`;

  // 9. Export file Excel
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const sanitizedFileName = data.invoiceNo.replace(/[\/\\:]/g, "-");
  saveAs(blob, `Invoice-${sanitizedFileName}.xlsx`);
}