// app/api/purchase-orders/export/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing PO ID" }, { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { orderBy: { itemIndex: "asc" } },
        adjustments: { orderBy: { adjustmentIndex: "asc" } },
      },
    });

    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "po-template.xlsx",
    );

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        {
          error:
            "Template file po-template.xlsx not found in public/templates/",
        },
        { status: 404 },
      );
    }

    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0];

    worksheet.getColumn("F").width = 12;
    worksheet.getColumn("G").width = 18;
    worksheet.getColumn("H").width = 22;

    if (po.companyName) worksheet.getCell("B2").value = po.companyName;
    worksheet.getCell("H3").value = new Date(po.date)
      .toISOString()
      .split("T")[0];
    worksheet.getCell("H4").value = po.poNumber;

    worksheet.getCell("B10").value = po.vendorName;
    worksheet.getCell("F10").value = po.shipToAddress;
    if (po.shipToContact) worksheet.getCell("F11").value = po.shipToContact;
    if (po.shipToPhone) worksheet.getCell("F12").value = po.shipToPhone;

    let subtotal = 0;
    for (let i = 0; i < 13; i++) {
      const rowIndex = 18 + i;
      const item = po.items[i];

      if (item) {
        subtotal += item.totalPrice;
        worksheet.getCell(`B${rowIndex}`).value = i + 1;
        worksheet.getCell(`C${rowIndex}`).value = item.description;
        worksheet.getCell(`C${rowIndex}`).alignment = {
          wrapText: true,
          vertical: "top",
        };

        worksheet.getCell(`F${rowIndex}`).value =
          item.quantity > 0 ? item.quantity : "";
        worksheet.getCell(`F${rowIndex}`).alignment = {
          horizontal: "center",
          vertical: "top",
        };

        worksheet.getCell(`G${rowIndex}`).value =
          item.unitPrice > 0 ? item.unitPrice : "";
        worksheet.getCell(`G${rowIndex}`).numFmt = "#,##0.00";
        worksheet.getCell(`G${rowIndex}`).alignment = {
          horizontal: "right",
          vertical: "top",
        };

        worksheet.getCell(`H${rowIndex}`).value =
          item.totalPrice > 0 ? item.totalPrice : "";
        worksheet.getCell(`H${rowIndex}`).numFmt = "#,##0.00";
        worksheet.getCell(`H${rowIndex}`).alignment = {
          horizontal: "right",
          vertical: "top",
        };
        worksheet.getCell(`H${rowIndex}`).font = { bold: true };
      } else {
        worksheet.getCell(`B${rowIndex}`).value = null;
        worksheet.getCell(`C${rowIndex}`).value = null;
        worksheet.getCell(`F${rowIndex}`).value = null;
        worksheet.getCell(`G${rowIndex}`).value = null;
        worksheet.getCell(`H${rowIndex}`).value = null;
      }
    }

    if (po.notes) {
      worksheet.getCell("B33").value = po.notes;
      worksheet.getCell("B33").alignment = { wrapText: true, vertical: "top" };
    }

    worksheet.getCell("H31").value = subtotal > 0 ? subtotal : "-";
    if (subtotal > 0) worksheet.getCell("H31").numFmt = "#,##0.00";
    worksheet.getCell("H31").font = { bold: true };

    let grandTotal = subtotal;
    for (let i = 0; i < 4; i++) {
      const rowIndex = 32 + i;
      const adj = po.adjustments[i];

      if (adj && adj.label) {
        grandTotal += adj.amount;
        worksheet.getCell(`G${rowIndex}`).value = adj.label;
        worksheet.getCell(`H${rowIndex}`).value =
          adj.amount !== 0 ? adj.amount : "-";
        if (adj.amount !== 0)
          worksheet.getCell(`H${rowIndex}`).numFmt = "#,##0.00";
      } else {
        worksheet.getCell(`G${rowIndex}`).value = null;
        worksheet.getCell(`H${rowIndex}`).value = "-";
      }
      worksheet.getCell(`H${rowIndex}`).alignment = { horizontal: "right" };
    }

    worksheet.getCell("H36").value = grandTotal;
    worksheet.getCell("H36").numFmt = '"Rp " #,##0.00';
    worksheet.getCell("H36").font = { bold: true };

    worksheet.getCell("C41").value = "RICHARD EDWIN GIOVANI";
    worksheet.getCell("C48").value = "(Richard Edwin Giovani)";

    if (po.vendorSignerName || po.vendorName) {
      const name = po.vendorSignerName || po.vendorName;
      worksheet.getCell("G41").value = name.toUpperCase();
      worksheet.getCell("G48").value = `(${name})`;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const safeFilename = po.poNumber.replace(/[/\\?%*:|"<>]/g, "_");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("PO Excel Export failed:", error);
    return NextResponse.json(
      { error: "Failed to export PO Excel" },
      { status: 500 },
    );
  }
}
