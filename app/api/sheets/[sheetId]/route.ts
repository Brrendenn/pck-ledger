// app/api/sheets/[sheetId]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sheetId: string }> }
) {
  try {
    const { sheetId } = await params;

    if (!sheetId) {
      return NextResponse.json({ error: 'sheetId is required' }, { status: 400 });
    }

    const sheet = await prisma.sheet.findUnique({
      where: { id: sheetId },
      include: {
        project: {
          include: {
            sheets: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    return NextResponse.json(sheet);
  } catch (error) {
    console.error('Failed to fetch sheet metadata:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sheetId: string }> }
) {
  try {
    const { sheetId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const sheet = await tx.sheet.findUnique({
        where: { id: sheetId },
        select: { id: true, projectId: true },
      });

      if (!sheet) {
        return null;
      }

      // Delete the target sheet
      await tx.sheet.delete({
        where: { id: sheetId },
      });

      // Check if any sheets remain in the parent project
      const remainingCount = await tx.sheet.count({
        where: { projectId: sheet.projectId },
      });

      let projectDeleted = false;
      if (remainingCount === 0) {
        await tx.project.delete({
          where: { id: sheet.projectId },
        });
        projectDeleted = true;
      }

      return {
        deletedSheetId: sheet.id,
        projectId: sheet.projectId,
        projectDeleted,
      };
    });

    if (!result) {
      return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to delete sheet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}