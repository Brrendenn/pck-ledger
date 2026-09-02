// app/api/sheets/[sheetId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sheetId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sheetId } = await params;
    const userRole = (session.user as any).role;
    const assignedProjectId = (session.user as any).assignedProjectId;

    const sheet = await prisma.sheet.findUnique({
      where: { id: sheetId },
      include: {
        project: true,
        transactions: { orderBy: { date: "asc" } },
      },
    });

    if (!sheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    // Security Gate: If Client, verify sheet belongs to their project
    if (userRole === "CLIENT" && sheet.projectId !== assignedProjectId) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to this project" },
        { status: 403 },
      );
    }

    return NextResponse.json(sheet);
  } catch (error) {
    console.error("Failed to load sheet:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sheetId: string }> },
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
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete sheet:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
