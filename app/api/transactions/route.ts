// app/api/transactions/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const transactionSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  code: z.string().min(1, 'Code is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().optional().nullable(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  sheetId: z.string().min(1, 'Sheet ID is required'),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');

    if (!sheetId) {
      return NextResponse.json({ error: 'sheetId is required' }, { status: 400 });
    }

    const sheet = await prisma.sheet.findUnique({
      where: { id: sheetId },
      select: { type: true },
    });

    const transactions = await prisma.transaction.findMany({
      where: { sheetId },
      orderBy: { date: 'asc' },
    });

    const isExpenseOnly = sheet?.type === 'EXPENSE_ONLY';
    let runningBalance = 0;

    const ledger = transactions.map((t) => {
      const debitVal = Number(t.debit);
      const creditVal = Number(t.credit);

      if (isExpenseOnly) {
        // Accumulate total expenses positively
        runningBalance += creditVal;
      } else {
        // Master cash ledger: Inflow - Outflow
        runningBalance = runningBalance + debitVal - creditVal;
      }

      return {
        ...t,
        debit: debitVal,
        credit: creditVal,
        saldo: runningBalance,
      };
    });

    return NextResponse.json(ledger);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = transactionSchema.parse(body);

    const currentSheet = await prisma.sheet.findUnique({
      where: { id: data.sheetId },
      include: { project: { include: { sheets: true } } },
    });

    if (!currentSheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const primaryTx = await tx.transaction.create({
        data: {
          date: data.date,
          code: data.code,
          description: data.description,
          category: data.category || null,
          debit: currentSheet.type === 'EXPENSE_ONLY' ? 0 : data.debit,
          credit: data.credit,
          sheetId: data.sheetId,
        },
      });

      // Auto-route categorized expenses to matching module sheet
      if (data.category && data.credit > 0) {
        const targetSheet = currentSheet.project.sheets.find(
          (s) =>
            s.id !== currentSheet.id &&
            (s.category?.toLowerCase() === data.category?.toLowerCase() ||
              s.name.toLowerCase().includes(data.category?.toLowerCase() || ''))
        );

        if (targetSheet) {
          await tx.transaction.create({
            data: {
              date: data.date,
              code: data.code,
              description: `[From ${currentSheet.name}] ${data.description}`,
              category: data.category,
              debit: 0,
              credit: data.credit,
              sheetId: targetSheet.id,
            },
          });
        }
      }

      return primaryTx;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to create transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}