// app/api/sheets/route.ts
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createSheetSchema = z.object({
  name: z.string().min(1, 'Sheet name is required'),
  category: z.string().optional().nullable(),
  projectId: z.string().min(1, 'Project ID is required'),
  type: z.enum(['EXPENSE_ONLY', 'DEBIT_CREDIT']).default('DEBIT_CREDIT'),
});

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;
  try {
    const body = await request.json();
    const { name, category, projectId, type } = createSheetSchema.parse(body);

    const sheet = await prisma.sheet.create({
      data: {
        name,
        category: category?.trim() || null,
        projectId,
        type,
      },
    });

    return NextResponse.json(sheet, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to create sheet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}