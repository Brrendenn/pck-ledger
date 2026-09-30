// app/api/transactions/bulk/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Helper: Safely parse dates from Excel serial numbers, ISO strings, or DD/MM/YYYY / DD-MMM-YY
function parseFlexibleDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  // Handle Excel numeric serial dates (e.g. 45543)
  if (typeof val === "number" || (!isNaN(Number(val)) && !String(val).includes("-") && !String(val).includes("/"))) {
    const serial = Number(val);
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date;
  }

  const str = String(val).trim();

  // Try standard Date parsing
  const native = new Date(str);
  if (!isNaN(native.getTime())) return native;

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    let year = parseInt(ddmmyyyy[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Handle Indonesian text dates like "7-Sept-26", "8 Sep 2026"
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
    jul: 6, agu: 7, agt: 7, aug: 7, sep: 8, sept: 8, okt: 9, oct: 9,
    nov: 10, des: 11, dec: 11,
  };

  const monthText = str.match(/^(\d{1,2})[\s\-](\w{3,4})[\s\-](\d{2,4})$/i);
  if (monthText) {
    const day = parseInt(monthText[1], 10);
    const mStr = monthText[2].toLowerCase();
    let year = parseInt(monthText[3], 10);
    if (year < 100) year += 2000;
    const m = monthMap[mStr];
    if (m !== undefined) {
      const d = new Date(year, m, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return new Date();
}

// Helper: Safely parse numbers from text ("Rp 750.000", "750,000", "-", empty)
function parseAmount(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).trim();
  if (str === "-" || str === "") return 0;

  // Keep numbers, commas, dots, and minus
  const clean = str.replace(/[^0-9,\.\-]/g, "");

  // Indonesian format with thousands separator: "1.500.000,00" or "1.500.000"
  if (clean.includes(".") && clean.includes(",")) {
    const normalized = clean.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  }
  if (clean.includes(".") && !clean.includes(",")) {
    const parts = clean.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      const n = parseFloat(clean.replace(/\./g, ""));
      return isNaN(n) ? 0 : n;
    }
  }
  const n = parseFloat(clean.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

const bulkRequestSchema = z.object({
  sheetId: z.string().min(1),
  transactions: z.array(z.record(z.string(), z.any())),
});

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { sheetId, transactions: rawList } = bulkRequestSchema.parse(body);

    const sheet = await prisma.sheet.findUnique({
      where: { id: sheetId },
      include: { project: { include: { sheets: true } } },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const isExpenseOnly = sheet.type === "EXPENSE_ONLY";

    // 1. Filter out empty phantom rows and normalize fields
    const validRows = rawList
      .map((row) => {
        const description = (
          row.description ||
          row.Keterangan ||
          row.keterangan ||
          ""
        ).toString().trim();

        const rawDate = row.date ?? row.Tanggal ?? row.tanggal;
        const code = (row.code || row.Kode || row.kode || "MT").toString().trim();
        const category = (
          row.category ||
          row.Kategori ||
          row.kategori ||
          ""
        ).toString().trim();

        // Support Debet/Credit as well as Pengeluaran/Jumlah
        const debitRaw = row.debit ?? row.Debet ?? row.debet;
        const creditRaw =
          row.credit ??
          row.Credit ??
          row.credit ??
          row.Pengeluaran ??
          row.pengeluaran ??
          row.Jumlah ??
          row.jumlah;

        const debit = parseAmount(debitRaw);
        const credit = parseAmount(creditRaw);

        return {
          date: parseFlexibleDate(rawDate),
          code: code || "MT",
          description,
          category: category || null,
          debit: isExpenseOnly ? 0 : debit,
          credit,
        };
      })
      .filter((r) => r.description.length > 0); // Ignore empty rows

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris data valid yang ditemukan untuk diimpor." },
        { status: 400 }
      );
    }

    // 2. Prepare primary & routed records
    const primaryRecords: any[] = [];
    const routedRecords: any[] = [];

    for (const t of validRows) {
      primaryRecords.push({
        date: t.date,
        code: t.code,
        description: t.description,
        category: t.category,
        debit: t.debit,
        credit: t.credit,
        sheetId,
      });

      // Cross-sheet category routing
      if (t.category && t.credit > 0 && sheet.project?.sheets) {
        const targetSheet = sheet.project.sheets.find(
          (s) =>
            s.id !== sheet.id &&
            (s.category?.toLowerCase() === t.category?.toLowerCase() ||
              s.name.toLowerCase().includes(t.category?.toLowerCase() || ""))
        );

        if (targetSheet) {
          routedRecords.push({
            date: t.date,
            code: t.code,
            description: `[From ${sheet.name}] ${t.description}`,
            category: t.category,
            debit: 0,
            credit: t.credit,
            sheetId: targetSheet.id,
          });
        }
      }
    }

    const allRecordsToInsert = [...primaryRecords, ...routedRecords];

    // 3. Batch insert with Prisma transaction
    await prisma.$transaction(
      async (tx) => {
        if (allRecordsToInsert.length > 0) {
          await tx.transaction.createMany({
            data: allRecordsToInsert,
          });
        }
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    return NextResponse.json({ success: true, count: validRows.length });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Format data tidak valid" },
        { status: 400 }
      );
    }
    console.error("Failed bulk transactions:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}