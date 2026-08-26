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

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createTransactionSchema.parse(body);

    // 1. Fetch target sheet and its sibling sheets in the project
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

    // 2. Locate the project's Global Sheet
    const globalSheet = projectSheets.find(
      (s) =>
        s.id !== currentSheet.id &&
        (s.name.toLowerCase().includes('global') || s.category?.toLowerCase() === 'global')
    );

    // 3. Locate category sub-sheet if category is provided
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

    // 4. Atomic transaction creation and cascading sync
    const createdPrimary = await prisma.$transaction(async (tx) => {
      // Create primary entry in current sheet
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

      // If this is an expense (credit > 0), sync automatically
      if (data.credit > 0) {
        // Auto-sync to Global Sheet if current sheet is not already Global
        if (globalSheet && !isCurrentGlobal) {
          await tx.transaction.create({
            data: {
              sheetId: globalSheet.id,
              date: new Date(data.date),
              code: data.code.toUpperCase(),
              description: data.description,
              category: data.category || currentSheet.name.replace('Pembukuan ', ''),
              debit: 0,
              credit: data.credit,
            },
          });
        }

        // Auto-sync to specific Module Sheet if category matches another sheet
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
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Failed to create transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}