// app/api/transactions/bulk/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import prisma from "@/lib/prisma";
import { z } from "zod";

const bulkSchema = z.object({
  sheetId: z.string().min(1),
  transactions: z.array(
    z.object({
      date: z.string().transform((str) => new Date(str)),
      code: z.string().default("MT"),
      description: z.string().min(1),
      category: z.string().nullable().optional(),
      debit: z.number().default(0),
      credit: z.number().default(0),
    }),
  ),
});

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { sheetId, transactions } = bulkSchema.parse(body);

    const sheet = await prisma.sheet.findUnique({
      where: { id: sheetId },
      include: { project: { include: { sheets: true } } },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    const isExpenseOnly = sheet.type === "EXPENSE_ONLY";

    // 1. Prepare batch records in memory without network overhead
    const primaryRecords: any[] = [];
    const routedRecords: any[] = [];

    for (const t of transactions) {
      primaryRecords.push({
        date: t.date,
        code: t.code,
        description: t.description,
        category: t.category || null,
        debit: isExpenseOnly ? 0 : t.debit,
        credit: t.credit,
        sheetId,
      });

      // Module category routing
      if (t.category && t.credit > 0) {
        const targetSheet = sheet.project.sheets.find(
          (s) =>
            s.id !== sheet.id &&
            (s.category?.toLowerCase() === t.category?.toLowerCase() ||
              s.name.toLowerCase().includes(t.category?.toLowerCase() || "")),
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

    // 2. Execute single batch query inside transaction with 30s timeout
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
      },
    );

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Failed bulk transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
