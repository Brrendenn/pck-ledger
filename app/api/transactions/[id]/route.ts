// app/api/transactions/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateTransactionSchema = z.object({
  date: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  code: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  debit: z.number().min(0).optional(),
  credit: z.number().min(0).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateTransactionSchema.parse(body);

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.date && { date: data.date }),
        ...(data.code && { code: data.code }),
        ...(data.description && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.debit !== undefined && { debit: data.debit }),
        ...(data.credit !== undefined && { credit: data.credit }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update transaction:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const deleted = await prisma.transaction.delete({
      where: { id },
    });
    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Failed to delete transaction:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
