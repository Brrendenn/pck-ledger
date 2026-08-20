// app/api/transactions/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Strict validation for new transactions
const transactionSchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  code: z.string().min(1, "Code is required"),
  description: z.string().min(1, "Description is required"),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  sheetId: z.string().min(1, "Sheet ID is required"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get("sheetId");

    if (!sheetId) {
      return NextResponse.json(
        { error: "sheetId is required" },
        { status: 400 },
      );
    }

    // 1. Fetch transactions chronologically
    const transactions = await prisma.transaction.findMany({
      where: { sheetId },
      orderBy: { date: "asc" },
    });

    // 2. Calculate the running balance (Saldo) dynamically
    let runningBalance = 0;
    const ledger = transactions.map((t) => {
      const debitVal = Number(t.debit);
      const creditVal = Number(t.credit);

      // Saldo = Previous Saldo + Debit (In) - Credit (Out)
      runningBalance = runningBalance + debitVal - creditVal;

      return {
        ...t,
        debit: debitVal,
        credit: creditVal,
        saldo: runningBalance,
      };
    });

    return NextResponse.json(ledger);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the incoming payload
    const validatedData = transactionSchema.parse(body);

    // Save to the database
    const newTransaction = await prisma.transaction.create({
      data: {
        date: validatedData.date,
        code: validatedData.code,
        description: validatedData.description,
        debit: validatedData.debit,
        credit: validatedData.credit,
        sheetId: validatedData.sheetId,
      },
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to create transaction:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
