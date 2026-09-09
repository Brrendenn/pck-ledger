// app/api/invoices/generate/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/auth-guard";

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoiceNo = "",
      recipientComp = "",
      recipientAttn = "",
      projectTitle = "",
      description = "",
      qty = "1",
      unit = "Fee",
      price = 0,
      accountNumber = "",
      accountName = "",
      date = new Date().toISOString(),
    } = body;

    let multiplier = 1;
    const cleanQty = String(qty).trim();
    if (cleanQty.endsWith("%")) {
      const pct = parseFloat(cleanQty.replace("%", ""));
      multiplier = isNaN(pct) ? 1 : pct / 100;
    } else {
      const num = parseFloat(cleanQty);
      multiplier = isNaN(num) ? 1 : num;
    }
    const totalAmount = multiplier * Number(price);

    const latestInvoice = await prisma.invoice.findFirst({
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    const nextSequence = (latestInvoice?.sequence ?? 145) + 1;

    await prisma.invoice.upsert({
      where: { invoiceNo: invoiceNo.trim() },
      update: {
        recipientComp: recipientComp.trim(),
        recipientAttn: recipientAttn.trim(),
        projectTitle: projectTitle.trim(),
        description: description.trim(),
        qty: cleanQty,
        unit: unit.trim(),
        price: Number(price),
        totalAmount,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      },
      create: {
        sequence: nextSequence,
        invoiceNo: invoiceNo.trim(),
        recipientComp: recipientComp.trim(),
        recipientAttn: recipientAttn.trim(),
        projectTitle: projectTitle.trim(),
        description: description.trim(),
        qty: cleanQty,
        unit: unit.trim(),
        price: Number(price),
        totalAmount,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
      },
    });

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "invoice-template.xlsx",
    );

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: "Template file invoice-template.xlsx not found." },
        { status: 404 },
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const worksheet =
      workbook.getWorksheet("Invoice Template") || workbook.worksheets[0];

    const todayFormatted = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));

    // 1. Metadata (Column N, Rows 3 & 4)
    worksheet.getCell("N3").value = invoiceNo;
    worksheet.getCell("N4").value = todayFormatted;
    worksheet.getCell("N3").font = { name: "Calibri", size: 11 };
    worksheet.getCell("N4").font = { name: "Calibri", size: 11 };

    // 2. Recipient Info (Column M, Rows 8 & 9)
    worksheet.getCell("L8").value = recipientComp;
    worksheet.getCell("L9").value = recipientAttn;
    worksheet.getCell("L8").font = { name: "Calibri", size: 11 };
    worksheet.getCell("L9").font = { name: "Calibri", size: 11 };

    // 3. Item Data (Starts on Row 13)
    // No in Column C
    worksheet.getCell("C13").value = 1;
    worksheet.getCell("C13").alignment = {
      horizontal: "center",
      vertical: "top",
    };
    worksheet.getCell("C13").font = { name: "Calibri", size: 11 };

    // Description in Column D
    const descCell = worksheet.getCell("D13");
    descCell.value = description;
    descCell.alignment = { wrapText: true, vertical: "top" };
    descCell.font = { name: "Calibri", size: 11 };

    // Qty in Column I
    const qtyCell = worksheet.getCell("I13");
    qtyCell.value = qty;
    qtyCell.alignment = { horizontal: "center", vertical: "middle" };
    qtyCell.font = { name: "Calibri", size: 11 };

    // Unit in Column J
    const unitCell = worksheet.getCell("J13");
    unitCell.value = unit || "Fee";
    unitCell.alignment = { horizontal: "center", vertical: "middle" };
    unitCell.font = { name: "Calibri", size: 11 };

    // Price in Column K
    const priceCell = worksheet.getCell("K13");
    priceCell.value = Number(price);
    priceCell.numFmt = '"Rp"\\ #,##0';
    priceCell.alignment = { horizontal: "center", vertical: "middle" };
    priceCell.font = { name: "Calibri", size: 11 };

    // Amount in Column M
    const amountCell = worksheet.getCell("M13");
    amountCell.value = totalAmount;
    amountCell.numFmt = '"Rp"\\ #,##0';
    amountCell.alignment = { horizontal: "right", vertical: "middle" };
    amountCell.font = { name: "Calibri", size: 11 };

    // 4. Project Scope Footer (C19)
    const scopeCell = worksheet.getCell("C19");
    scopeCell.value = projectTitle;
    scopeCell.font = { name: "Calibri", size: 11, bold: true };
    scopeCell.alignment = { horizontal: "center", vertical: "middle" };

    // 5. Total Summary Amount (Row 20)
    const totalCell = worksheet.getCell("M20");
    totalCell.value = totalAmount;
    totalCell.numFmt = '"Rp"\\ #,##0';

    // 6. Payment Information (Column G)
    worksheet.getCell("G23").value = "BANK BCA";
    worksheet.getCell("G24").value = accountNumber;
    worksheet.getCell("G25").value = accountName;
    ["G23", "G24", "G25"].forEach((cell) => {
      worksheet.getCell(cell).font = { name: "Calibri", size: 11 };
      worksheet.getCell(cell).alignment = {
        horizontal: "left",
        vertical: "middle",
      };
    });

    // 7. Signature Date
    worksheet.getCell("L22").value = `Jakarta, ${todayFormatted}`;
    worksheet.getCell("L22").font = { name: "Calibri", size: 11 };
    worksheet.getCell("L22").alignment = { horizontal: "center" };

    const buffer = await workbook.xlsx.writeBuffer();
    const safeFilename = invoiceNo.replace(/[\/\\:]/g, "-");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Invoice-${safeFilename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Invoice Generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate Invoice" },
      { status: 500 },
    );
  }
}
