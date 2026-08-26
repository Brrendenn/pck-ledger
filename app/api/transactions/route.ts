// app/api/transactions/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';

const createTransactionSchema = z.object({
  sheetId: z.string().min(1),
  date: z.string(),
  code: z.string().min(1),
  description: z.string().min(1),
  category: z.string().nullable().optional(),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
});

// 1. GET: Fetch transactions for a given sheet
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheetId');

    if (!sheetId) {
      return NextResponse.json({ error: 'sheetId is required' }, { status: 400 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { sheetId },
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST: Create transaction with automatic Global sync
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createTransactionSchema.parse(body);

    // Fetch target sheet and siblings in the same project
    const currentSheet = await prisma.sheet.findUnique({
      where: { id: data.sheetId },
      include: {
        project: {
          include: {
            sheets: true,
          },
        },
      },
    });

    if (!currentSheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    const projectSheets = currentSheet.project.sheets;
    const isCurrentGlobal =
      currentSheet.name.toLowerCase().includes('global') ||
      currentSheet.category?.toLowerCase() === 'global';

    // Locate the project's Global Sheet
    const globalSheet = projectSheets.find(
      (s) =>
        s.id !== currentSheet.id &&
        (s.name.toLowerCase().includes('global') || s.category?.toLowerCase() === 'global')
    );

    // Locate matching category sheet if applicable
    let categorySheet = null;
    if (data.category) {
      const cleanCat = data.category.trim().toLowerCase();
      categorySheet = projectSheets.find(
        (s) =>
          s.id !== currentSheet.id &&
          s.id !== globalSheet?.id &&
          (s.name.toLowerCase().includes(cleanCat) || s.category?.toLowerCase() === cleanCat)
      );
    }

    // Atomic transaction creation and cascading sync
    const createdPrimary = await prisma.$transaction(async (tx) => {
      const primary = await tx.transaction.create({
        data: {
          sheetId: currentSheet.id,
          date: new Date(data.date),
          code: data.code.toUpperCase(),
          description: data.description,
          category: data.category || null,
          debit: data.debit,
          credit: data.credit,
        },
      });

      // Auto-sync expenses (credit > 0)
      if (data.credit > 0) {
        // Sync to Pembukuan Global
        if (globalSheet && !isCurrentGlobal) {
          await tx.transaction.create({
            data: {
              sheetId: globalSheet.id,
              date: new Date(data.date),
              code: data.code.toUpperCase(),
              description: data.description,
              category: data.category || currentSheet.name.replace(/^Pembukuan\s+/i, ''),
              debit: 0,
              credit: data.credit,
            },
          });
        }

        // Sync to category module sheet if matched
        if (categorySheet) {
          await tx.transaction.create({
            data: {
              sheetId: categorySheet.id,
              date: new Date(data.date),
              code: data.code.toUpperCase(),
              description: data.description,
              category: data.category || null,
              debit: 0,
              credit: data.credit,
            },
          });
        }
      }

      return primary;
    });

    return NextResponse.json(createdPrimary, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to create transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}