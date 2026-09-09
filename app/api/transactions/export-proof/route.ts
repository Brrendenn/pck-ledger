// app/api/transactions/export-proof/route.ts
// Generates a "Proof of Transaction" PDF for a date range within a sheet.
// Layout: transaction summary table, then attachment images grouped under each transaction.

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

    // Calculate running balance
    let runningBalance = 0;

    const rows = transactions.map((t) => {
      const debit = Number(t.debit) || 0;
      const credit = Number(t.credit) || 0;

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

    const periodStart = data.startDate || formatDateShort(transactions[0].date);
    const periodEnd = data.endDate || formatDateShort(transactions[transactions.length - 1].date);

    // ─── PDF GENERATION ───────────────────────────────────────

    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // Colors
    const darkGray: [number, number, number] = [39, 39, 42]; // zinc-800
    const lightGray: [number, number, number] = [244, 244, 245]; // zinc-100
    const accentGreen: [number, number, number] = [22, 163, 74]; // green-600

    // ─── SUMMARY TABLE (first page) ───────────────────────────

    const tableHeaders = isExpenseOnly
      ? [["Tanggal", "Kode", "Keterangan", "Jumlah (Rp)", "Saldo (Rp)"]]
      : [["Tanggal", "Kode", "Keterangan", "Debit (Rp)", "Credit (Rp)", "Saldo (Rp)"]];

    const tableRows = rows.map((r) => {
      const base = [formatDate(r.date), r.code, r.description];
      if (isExpenseOnly) {
        base.push(formatRp(r.credit), formatRp(r.saldo));
      } else {
        base.push(formatRp(r.debit), formatRp(r.credit), formatRp(r.saldo));
      }
      return base;
    });

    const colStyles: Record<number, { halign: "right" | "left" | "center" }> = {};
    for (let c = 3; c <= (isExpenseOnly ? 4 : 5); c++) {
      colStyles[c] = { halign: "right" };
    }

    autoTable(doc, {
      startY: margin,
      head: tableHeaders,
      body: tableRows,
      theme: "grid",
      styles: {
        fontSize: 8,
        font: "helvetica",
        cellPadding: 4,
        lineColor: [228, 228, 231] as [number, number, number],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: darkGray,
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: colStyles,
      margin: { left: margin, right: margin },
    });

    // ─── ATTACHMENT IMAGES (2-column grid, grouped per transaction) ───

    if (transactionsWithAttachments.length > 0) {
      doc.addPage();

      // Grid layout: 2 columns, images flow to fill space
      const gap = 12;
      const colWidth = (contentWidth - gap) / 2;
      const headerHeight = 26;
      const rowLabelGap = 8;

      let cursorY = margin;

      for (const tx of transactionsWithAttachments) {
        // ─── Collect this transaction's usable images first ───
        const images: { dataUri: string; w: number; h: number; format: string }[] = [];

        for (const attachment of tx.attachments) {
          if (!attachment.mimetype.startsWith("image/")) continue;

          const imageData = await fetchImageAsBase64(
            attachment.url,
            attachment.mimetype
          );
          if (!imageData) continue;

          // Scale image to fit within one column, cap height so tall
          // receipts don't dominate a whole page
          let w = colWidth;
          let h = colWidth * 1.3; // fallback ratio
          try {
            const props = doc.getImageProperties(imageData.dataUri);
            const maxH = 320; // cap column image height
            const ratio = Math.min(colWidth / props.width, maxH / props.height);
            w = props.width * ratio;
            h = props.height * ratio;
          } catch {
            // keep fallback
          }

          images.push({
            dataUri: imageData.dataUri,
            w,
            h,
            format: attachment.mimetype === "image/png" ? "PNG" : "JPEG",
          });
        }

        if (images.length === 0) continue; // no renderable images, skip group

        // ─── Transaction header row ───
        if (cursorY > pageHeight - margin - headerHeight - 80) {
          doc.addPage();
          cursorY = margin;
        }

        doc.setFillColor(...lightGray);
        doc.rect(margin, cursorY, contentWidth, headerHeight, "F");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...darkGray);
        doc.text(
          `${formatDate(tx.date)}  —  ${tx.code}  —  ${tx.description}`,
          margin + 8,
          cursorY + 17,
          { maxWidth: contentWidth - 150 }
        );

        const amountText =
          tx.credit > 0
            ? `Rp ${formatRp(tx.credit)}`
            : `Rp ${formatRp(tx.debit)}`;
        doc.setTextColor(...accentGreen);
        doc.text(amountText, pageWidth - margin - 8, cursorY + 17, {
          align: "right",
        });

        cursorY += headerHeight + rowLabelGap;

        // ─── Place images in a 2-column grid ───
        let col = 0; // 0 = left, 1 = right
        let rowMaxHeight = 0;
        let rowStartY = cursorY;

        for (const img of images) {
          // If starting a new row (left column), check page space
          if (col === 0) {
            if (rowStartY + img.h > pageHeight - margin) {
              doc.addPage();
              rowStartY = margin;
            }
            rowMaxHeight = 0;
          }

          const x = margin + col * (colWidth + gap);
          // Center the image horizontally within its column
          const xOffset = (colWidth - img.w) / 2;

          try {
            doc.addImage(
              img.dataUri,
              img.format,
              x + xOffset,
              rowStartY,
              img.w,
              img.h
            );
          } catch {
            // skip unrenderable image
          }

          rowMaxHeight = Math.max(rowMaxHeight, img.h);

          if (col === 0) {
            col = 1; // move to right column, same row
          } else {
            // completed a row, advance down
            col = 0;
            rowStartY += rowMaxHeight + gap;
          }
        }

        // If the last image landed in the left column, advance past its row
        if (col === 1) {
          rowStartY += rowMaxHeight + gap;
        }

        cursorY = rowStartY + 10; // spacing before next transaction
      }
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
