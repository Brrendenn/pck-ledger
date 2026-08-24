// app/api/transactions/bulk/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const singleTxSchema = z.object({
  date: z.any().transform((val) => {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }),
  code: z.any().transform((val) => (val ? String(val).trim() : '-')),
  description: z.any().transform((val) => (val ? String(val).trim() : '')),
  category: z.any().transform((val) => (val ? String(val).trim() : null)).optional(),
  debit: z.any().transform((val) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : Math.max(0, num);
  }),
  credit: z.any().transform((val) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : Math.max(0, num);
  }),
});

const bulkTransactionSchema = z.object({
  sheetId: z.string().min(1, 'Sheet ID is required'),
  transactions: z.array(singleTxSchema),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sheetId, transactions } = bulkTransactionSchema.parse(body);

    const validRecords = transactions
      .filter((t) => t.description.length > 0)
      .map((t) => ({
        sheetId,
        date: t.date,
        code: t.code,
        description: t.description,
        category: t.category ?? null,
        debit: t.debit,
        credit: t.credit,
      }));

    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: 'No valid rows found to import. Check that your spreadsheet has description/keterangan entries.' },
        { status: 400 }
      );
    }

    const result = await prisma.transaction.createMany({
      data: validRecords,
    });

    return NextResponse.json({ count: result.count }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to bulk import transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}