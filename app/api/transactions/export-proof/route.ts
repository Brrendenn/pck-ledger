// app/api/transactions/export-proof/route.ts
// Generates a "Proof of Transaction" PDF for a date range within a sheet.
// Includes a cover page, transaction summary table, and proof pages with embedded images.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { get as getBlob } from "@vercel/blob";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { z } from "zod";

const requestSchema = z.object({
  sheetId: z.string().min(1),
  startDate: z.string().optional(), // ISO date string YYYY-MM-DD
  endDate: z.string().optional(),
  transactionIds: z.array(z.string()).optional(), // specific rows, or omit for all filtered
});

// Format currency in Indonesian style
function formatRp(amount: number): string {
  if (amount === 0) return "-";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date in clean display format
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Format date for filename
function formatDateShort(date: Date): string {
  return new Date(date).toLocaleDateString("en-CA"); // YYYY-MM-DD
}

// Fetch image as base64 data URI from Vercel Blob (supports both private and public stores)
async function fetchImageAsBase64(
  url: string,
  mimetype: string
): Promise<{ dataUri: string; width: number; height: number } | null> {
  try {
    // Try authenticated Blob SDK first (works for private stores)
    let buffer: ArrayBuffer;

    try {
      const result = await getBlob(url, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) {
        throw new Error("Blob get() returned no stream");
      }
      // Consume the ReadableStream into a buffer
      const reader = result.stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      buffer = merged.buffer;
    } catch {
      // Fallback to plain fetch (works for public stores)
      const response = await fetch(url);
      if (!response.ok) return null;
      buffer = await response.arrayBuffer();
    }

    const base64 = Buffer.from(buffer).toString("base64");

    // Use image/jpeg for the data URI regardless of original type,
    // since jsPDF handles JPEG most reliably
    const safeType = mimetype === "image/png" ? "image/png" : "image/jpeg";
    const dataUri = `data:${safeType};base64,${base64}`;

    return { dataUri, width: 0, height: 0 };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = requestSchema.parse(body);

    // Fetch sheet with project info
    const sheet = await prisma.sheet.findUnique({
      where: { id: data.sheetId },
      include: { project: true },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const isExpenseOnly = sheet.type === "EXPENSE_ONLY";

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (data.startDate) dateFilter.gte = new Date(`${data.startDate}T00:00:00.000Z`);
    if (data.endDate) dateFilter.lte = new Date(`${data.endDate}T23:59:59.999Z`);

    // Fetch transactions with attachments
    const transactions = await prisma.transaction.findMany({
      where: {
        sheetId: data.sheetId,
        ...(data.transactionIds && data.transactionIds.length > 0
          ? { id: { in: data.transactionIds } }
          : {}),
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      include: {
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions found for the selected period" },
        { status: 404 }
      );
    }

    // Calculate totals and running balance
    let totalDebit = 0;
    let totalCredit = 0;
    let runningBalance = 0;

    const rows = transactions.map((t) => {
      const debit = Number(t.debit) || 0;
      const credit = Number(t.credit) || 0;
      totalDebit += debit;
      totalCredit += credit;

      if (isExpenseOnly) {
        runningBalance += credit;
      } else {
        runningBalance += debit - credit;
      }

      return {
        ...t,
        debit,
        credit,
        saldo: runningBalance,
        attachmentCount: t.attachments.length,
      };
    });

    const transactionsWithAttachments = rows.filter((r) => r.attachmentCount > 0);

    // ─── PDF GENERATION ───────────────────────────────────────

    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // Colors
    const darkGray: [number, number, number] = [39, 39, 42]; // zinc-800
    const mediumGray: [number, number, number] = [113, 113, 122]; // zinc-500
    const lightGray: [number, number, number] = [244, 244, 245]; // zinc-100
    const accentGreen: [number, number, number] = [22, 163, 74]; // green-600

    // ─── COVER PAGE ───────────────────────────────────────────

    // Company name
    doc.setFontSize(10);
    doc.setTextColor(...mediumGray);
    doc.text(sheet.project.company || "PT PERDANA CIPTA KREASINDO", margin, margin + 20);

    // Title
    doc.setFontSize(22);
    doc.setTextColor(...darkGray);
    doc.text("Bukti Transaksi", margin, margin + 50);

    // Subtitle: project name
    doc.setFontSize(14);
    doc.setTextColor(...mediumGray);
    doc.text(sheet.project.name, margin, margin + 72);

    // Sheet name
    doc.setFontSize(11);
    doc.text(`Sheet: ${sheet.name}`, margin, margin + 92);

    // Period
    const periodStart = data.startDate || formatDateShort(transactions[0].date);
    const periodEnd = data.endDate || formatDateShort(transactions[transactions.length - 1].date);
    doc.text(`Periode: ${periodStart}  —  ${periodEnd}`, margin, margin + 112);

    // Divider line
    const dividerY = margin + 135;
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.line(margin, dividerY, pageWidth - margin, dividerY);

    // Summary stats
    const statsY = dividerY + 30;
    doc.setFontSize(10);
    doc.setTextColor(...mediumGray);

    const statsLeft = [
      ["Total Transaksi", `${transactions.length}`],
      ["Transaksi dgn Bukti", `${transactionsWithAttachments.length}`],
    ];
    const statsRight = [
      ["Total Debit", `Rp ${formatRp(totalDebit)}`],
      ["Total Credit", `Rp ${formatRp(totalCredit)}`],
    ];

    statsLeft.forEach(([label, value], i) => {
      const y = statsY + i * 20;
      doc.setTextColor(...mediumGray);
      doc.text(label, margin, y);
      doc.setTextColor(...darkGray);
      doc.setFont("helvetica", "bold");
      doc.text(value, margin + 140, y);
      doc.setFont("helvetica", "normal");
    });

    statsRight.forEach(([label, value], i) => {
      const y = statsY + i * 20;
      doc.setTextColor(...mediumGray);
      doc.text(label, pageWidth / 2 + 20, y);
      doc.setTextColor(...darkGray);
      doc.setFont("helvetica", "bold");
      doc.text(value, pageWidth / 2 + 160, y);
      doc.setFont("helvetica", "normal");
    });

    // Generated timestamp
    doc.setFontSize(8);
    doc.setTextColor(...mediumGray);
    doc.text(
      `Dibuat: ${new Date().toLocaleString("id-ID")}`,
      margin,
      pageHeight - margin
    );

    // ─── SUMMARY TABLE ────────────────────────────────────────

    doc.addPage();

    doc.setFontSize(14);
    doc.setTextColor(...darkGray);
    doc.text("Ringkasan Transaksi", margin, margin + 20);

    doc.setFontSize(9);
    doc.setTextColor(...mediumGray);
    doc.text(
      `${transactions.length} transaksi  •  ${transactionsWithAttachments.length} dengan bukti lampiran`,
      margin,
      margin + 38
    );

    const tableHeaders = isExpenseOnly
      ? [["Tanggal", "Kode", "Keterangan", "Jumlah (Rp)", "Saldo (Rp)", "📎"]]
      : [["Tanggal", "Kode", "Keterangan", "Debit (Rp)", "Credit (Rp)", "Saldo (Rp)", "📎"]];

    const tableRows = rows.map((r) => {
      const base = [
        formatDate(r.date),
        r.code,
        r.description,
      ];

      if (isExpenseOnly) {
        base.push(formatRp(r.credit), formatRp(r.saldo));
      } else {
        base.push(formatRp(r.debit), formatRp(r.credit), formatRp(r.saldo));
      }

      base.push(r.attachmentCount > 0 ? `${r.attachmentCount}` : "");
      return base;
    });

    const moneyColStart = isExpenseOnly ? 3 : 3;
    const moneyColEnd = isExpenseOnly ? 4 : 5;
    const colStyles: Record<number, { halign: "right" | "left" | "center" }> = {};
    for (let c = moneyColStart; c <= moneyColEnd; c++) {
      colStyles[c] = { halign: "right" };
    }
    // Attachment count column centered
    colStyles[isExpenseOnly ? 5 : 6] = { halign: "center" };

    autoTable(doc, {
      startY: margin + 50,
      head: tableHeaders,
      body: tableRows,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        font: "helvetica",
        cellPadding: 4,
        lineColor: [228, 228, 231] as [number, number, number],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: darkGray,
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      columnStyles: colStyles,
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        // Page footer
        doc.setFontSize(7);
        doc.setTextColor(...mediumGray);
        const pageNum = doc.getNumberOfPages();
        doc.text(
          `Halaman ${pageNum}`,
          pageWidth - margin,
          pageHeight - 20,
          { align: "right" }
        );
      },
    });

    // ─── PROOF PAGES ──────────────────────────────────────────

    if (transactionsWithAttachments.length > 0) {
      doc.addPage();

      doc.setFontSize(14);
      doc.setTextColor(...darkGray);
      doc.text("Bukti Lampiran", margin, margin + 20);

      doc.setFontSize(9);
      doc.setTextColor(...mediumGray);
      doc.text(
        `${transactionsWithAttachments.length} transaksi dengan bukti foto/dokumen`,
        margin,
        margin + 38
      );

      let cursorY = margin + 60;
      let proofIndex = 0;

      for (const tx of transactionsWithAttachments) {
        proofIndex++;

        // Check if we need a new page for this transaction header
        if (cursorY > pageHeight - 200) {
          doc.addPage();
          cursorY = margin + 20;
        }

        // ─── Transaction header ───
        // Light background box
        doc.setFillColor(...lightGray);
        doc.roundedRect(margin, cursorY, contentWidth, 52, 4, 4, "F");

        // Transaction number and date
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkGray);
        doc.text(
          `#${proofIndex}  —  ${formatDate(tx.date)}  —  ${tx.code}`,
          margin + 10,
          cursorY + 18
        );

        // Description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...mediumGray);

        // Truncate long descriptions
        const descText =
          tx.description.length > 80
            ? tx.description.substring(0, 77) + "..."
            : tx.description;
        doc.text(descText, margin + 10, cursorY + 33);

        // Amount on the right
        const amountText = tx.credit > 0
          ? `Credit: Rp ${formatRp(tx.credit)}`
          : `Debit: Rp ${formatRp(tx.debit)}`;

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...accentGreen);
        doc.text(amountText, pageWidth - margin - 10, cursorY + 18, {
          align: "right",
        });

        // Attachment count
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...mediumGray);
        doc.text(
          `${tx.attachments.length} lampiran`,
          pageWidth - margin - 10,
          cursorY + 33,
          { align: "right" }
        );

        cursorY += 62;

        // ─── Attachment images ───
        for (const attachment of tx.attachments) {
          const isImage = attachment.mimetype.startsWith("image/");

          if (!isImage) {
            // PDF or non-image attachment: show reference only
            if (cursorY > pageHeight - 60) {
              doc.addPage();
              cursorY = margin + 20;
            }

            doc.setFontSize(8);
            doc.setTextColor(...mediumGray);
            doc.text(
              `📄 ${attachment.filename}  —  ${(attachment.filesize / 1024).toFixed(0)} KB  —  ${attachment.mimetype}`,
              margin + 10,
              cursorY + 10
            );
            doc.setFontSize(7);
            doc.text(
              "(Dokumen PDF — lihat terpisah di aplikasi)",
              margin + 10,
              cursorY + 22
            );
            cursorY += 35;
            continue;
          }

          // Fetch image from Blob
          const imageData = await fetchImageAsBase64(
            attachment.url,
            attachment.mimetype
          );

          if (!imageData) {
            // Failed to fetch — show placeholder
            if (cursorY > pageHeight - 50) {
              doc.addPage();
              cursorY = margin + 20;
            }

            doc.setFontSize(8);
            doc.setTextColor(200, 50, 50);
            doc.text(
              `⚠ Gagal memuat: ${attachment.filename}`,
              margin + 10,
              cursorY + 10
            );
            cursorY += 25;
            continue;
          }

          // Calculate image dimensions to fit within content area
          // Max image width: contentWidth - 20 (padding), max height: 340pt
          const maxImgWidth = contentWidth - 20;
          const maxImgHeight = 340;

          // We need actual dimensions — extract from the image
          let imgWidth = maxImgWidth;
          let imgHeight = maxImgHeight * 0.6; // default fallback aspect ratio

          try {
            // Try to get image properties from jsPDF
            const imgProps = doc.getImageProperties(imageData.dataUri);
            const ratio = Math.min(
              maxImgWidth / imgProps.width,
              maxImgHeight / imgProps.height
            );
            imgWidth = imgProps.width * ratio;
            imgHeight = imgProps.height * ratio;
          } catch {
            // Fallback to default dimensions
          }

          // Check if image fits on current page
          if (cursorY + imgHeight + 30 > pageHeight - margin) {
            doc.addPage();
            cursorY = margin + 20;
          }

          // Draw image
          try {
            const imgFormat = attachment.mimetype === "image/png" ? "PNG" : "JPEG";
            doc.addImage(
              imageData.dataUri,
              imgFormat,
              margin + 10,
              cursorY,
              imgWidth,
              imgHeight
            );
            cursorY += imgHeight + 8;
          } catch {
            doc.setFontSize(8);
            doc.setTextColor(200, 50, 50);
            doc.text(
              `⚠ Format tidak didukung: ${attachment.filename}`,
              margin + 10,
              cursorY + 10
            );
            cursorY += 25;
          }

          // Filename caption
          doc.setFontSize(7);
          doc.setTextColor(...mediumGray);
          doc.text(
            `${attachment.filename}  •  ${(attachment.filesize / 1024).toFixed(0)} KB`,
            margin + 10,
            cursorY
          );
          cursorY += 20;
        }

        // Separator line between transactions
        if (cursorY < pageHeight - 40) {
          doc.setDrawColor(228, 228, 231);
          doc.setLineWidth(0.5);
          doc.line(margin, cursorY, pageWidth - margin, cursorY);
          cursorY += 15;
        }
      }
    }

    // ─── Add page numbers to all pages ────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...mediumGray);
      doc.text(
        `Halaman ${i} / ${totalPages}`,
        pageWidth - margin,
        pageHeight - 20,
        { align: "right" }
      );
    }

    // ─── Output ───────────────────────────────────────────────

    const pdfBuffer = doc.output("arraybuffer");

    const safeName = sheet.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Bukti_Transaksi_${safeName}_${periodStart}_${periodEnd}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Export proof failed:", error);
    return NextResponse.json(
      { error: "Failed to generate proof PDF" },
      { status: 500 }
    );
  }
}
