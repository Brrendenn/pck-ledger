// app/api/projects/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        sheets: {
          include: {
            transactions: {
              orderBy: { date: "desc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let totalProjectDebit = 0;
    let totalProjectCredit = 0;
    const allTransactions: any[] = [];

    const sheetSummaries = project.sheets.map((sheet) => {
      let sheetDebit = 0;
      let sheetCredit = 0;

      sheet.transactions.forEach((tx) => {
        const d = Number(tx.debit) || 0;
        const c = Number(tx.credit) || 0;
        sheetDebit += d;
        sheetCredit += c;

        allTransactions.push({
          ...tx,
          debit: d,
          credit: c,
          sheetName: sheet.name,
          sheetType: sheet.type,
        });
      });

      // Master cash accounts track net inflows; expense modules track disbursements
      if (sheet.type === "DEBIT_CREDIT") {
        totalProjectDebit += sheetDebit;
        totalProjectCredit += sheetCredit;
      }

      return {
        id: sheet.id,
        name: sheet.name,
        category: sheet.category,
        type: sheet.type,
        totalDebit: sheetDebit,
        totalCredit: sheetCredit,
        balance:
          sheet.type === "EXPENSE_ONLY"
            ? sheetCredit
            : sheetDebit - sheetCredit,
        transactionCount: sheet.transactions.length,
        latestActivity: sheet.transactions[0]?.date || null,
      };
    });

    // Sort recent activity across all project sheets
    allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const totalModuleExpenses = sheetSummaries
      .filter((s) => s.type === "EXPENSE_ONLY")
      .reduce((acc, curr) => acc + curr.totalCredit, 0);

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        company: project.company,
        createdAt: project.createdAt,
      },
      stats: {
        totalInflow: totalProjectDebit,
        totalOutflow: totalProjectCredit,
        netCashBalance: totalProjectDebit - totalProjectCredit,
        totalModuleExpenses,
        totalSheets: project.sheets.length,
        totalTransactions: allTransactions.length,
      },
      sheets: sheetSummaries,
      recentTransactions: allTransactions.slice(0, 8),
    });
  } catch (error) {
    console.error("Failed to load project summary:", error);
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

    const deleted = await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
