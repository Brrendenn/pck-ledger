// app/api/transactions/bulk-delete/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "At least one transaction ID is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = bulkDeleteSchema.parse(body);

    const result = await prisma.transaction.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to bulk delete transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
