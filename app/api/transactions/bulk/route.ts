// app/api/transactions/bulk/route.ts
import { NextResponse } from "next/server";
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

    await prisma.$transaction(async (tx) => {
      for (const t of transactions) {
        await tx.transaction.create({
          data: {
            date: t.date,
            code: t.code,
            description: t.description,
            category: t.category,
            debit: isExpenseOnly ? 0 : t.debit,
            credit: t.credit,
            sheetId,
          },
        });

        // Route to category module sheet if applicable
        if (t.category && t.credit > 0) {
          const targetSheet = sheet.project.sheets.find(
            (s) =>
              s.id !== sheet.id &&
              (s.category?.toLowerCase() === t.category?.toLowerCase() ||
                s.name.toLowerCase().includes(t.category?.toLowerCase() || "")),
          );

          if (targetSheet) {
            await tx.transaction.create({
              data: {
                date: t.date,
                code: t.code,
                description: `[From ${sheet.name}] ${t.description}`,
                category: t.category,
                debit: 0,
                credit: t.credit,
                sheetId: targetSheet.id,
              },
            });
          }
        }
      }
    });

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
