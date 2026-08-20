// app/api/projects/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  company: z.string().min(1, 'Company name is required'),
  initialSheets: z.array(z.string()).default(['Kas', 'Pembukuan Global']),
});

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        sheets: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, company, initialSheets } = createProjectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        name,
        company,
        sheets: {
          create: initialSheets.map((sheetName) => ({
            name: sheetName,
            type: sheetName.toLowerCase().includes('kas') ? 'DEBIT_CREDIT' : 'EXPENSE_ONLY',
          })),
        },
      },
      include: {
        sheets: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}