// app/api/purchase-orders/generate/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import ExcelJS from "exceljs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName = "PT PERDANA CIPTA KREASINDO",
      poNumber = "",
      date = "",
      vendorName = "",
      vendorAddress = "",
      vendorSignerName = "",
      shipToAddress = "",
      shipToContact = "",
      shipToPhone = "",
      projectId = null,
      items = [],
      notes = "",
      adjustments = [],
    } = body;

    // 1. Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: any) =>
        sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
      0,
    );
    const adjustmentTotal = adjustments.reduce(
      (sum: number, adj: any) => sum + (Number(adj.amount) || 0),
      0,
    );
    const grandTotal = subtotal + adjustmentTotal;

    // 2. Auto-save / Upsert Vendor
    if (vendorName.trim()) {
      await prisma.vendor.upsert({
        where: { name: vendorName.trim() },
        update: {
          address: vendorAddress.trim() || undefined,
          signerName: vendorSignerName.trim() || undefined,
        },
        create: {
          name: vendorName.trim(),
          address: vendorAddress.trim() || null,
          signerName: vendorSignerName.trim() || null,
        },
      });
    }

    // 3. Auto-save Project Preset details (MUST BE BEFORE RETURN)
    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          location: shipToAddress.trim() || undefined,
          contactName: shipToContact.trim() || undefined,
          contactPhone: shipToPhone.trim() || undefined,
        },
      });
    }

    // 4. Save PO record in DB
    await prisma.purchaseOrder.upsert({
      where: { poNumber: poNumber.trim() },
      update: {
        date: new Date(date),
        companyName,
        vendorName: vendorName.trim(),
        vendorSignerName: vendorSignerName.trim() || null,
        shipToAddress: shipToAddress.trim(),
        shipToContact: shipToContact.trim() || null,
        shipToPhone: shipToPhone.trim() || null,
        notes: notes.trim() || null,
        subtotal,
        totalAmount: grandTotal,
        projectId: projectId || null,
      },
      create: {
        poNumber: poNumber.trim(),
        date: new Date(date),
        companyName,
        vendorName: vendorName.trim(),
        vendorSignerName: vendorSignerName.trim() || null,
        shipToAddress: shipToAddress.trim(),
        shipToContact: shipToContact.trim() || null,
        shipToPhone: shipToPhone.trim() || null,
        notes: notes.trim() || null,
        subtotal,
        totalAmount: grandTotal,
        projectId: projectId || null,
        items: {
          create: items.map((i: any, idx: number) => ({
            itemIndex: idx + 1,
            description: i.description,
            quantity: Number(i.qty) || 0,
            unitPrice: Number(i.unitPrice) || 0,
            totalPrice: (Number(i.qty) || 0) * (Number(i.unitPrice) || 0),
          })),
        },
        adjustments: {
          create: adjustments
            .filter((a: any) => a.label?.trim())
            .map((a: any, idx: number) => ({
              adjustmentIndex: idx + 1,
              label: a.label.trim(),
              amount: Number(a.amount) || 0,
            })),
        },
      },
    });

    // 5. Populate Excel Template
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

    if (companyName.trim()) {
      worksheet.getCell("B2").value = companyName.trim();
    }

    worksheet.getCell("H3").value = date;
    worksheet.getCell("H4").value = poNumber;

    worksheet.getCell("B10").value = vendorName.trim();
    if (vendorAddress.trim()) {
      worksheet.getCell("B11").value = vendorAddress.trim();
    } else {
      worksheet.getCell("B11").value = null;
    }

    worksheet.getCell("F10").value = shipToAddress.trim();
    worksheet.getCell("F11").value = shipToContact.trim();
    worksheet.getCell("F12").value = shipToPhone.trim();

    for (let i = 0; i < 13; i++) {
      const rowIndex = 18 + i;
      const item = items[i];

      if (item && (item.description || item.qty || item.unitPrice)) {
        const qty = Number(item.qty) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const lineTotal = qty * unitPrice;

        worksheet.getCell(`B${rowIndex}`).value = i + 1;
        worksheet.getCell(`C${rowIndex}`).value = item.description;
        worksheet.getCell(`C${rowIndex}`).alignment = {
          wrapText: true,
          vertical: "top",
        };

        worksheet.getCell(`F${rowIndex}`).value = qty > 0 ? qty : "";
        worksheet.getCell(`F${rowIndex}`).alignment = {
          horizontal: "center",
          vertical: "top",
        };

        worksheet.getCell(`G${rowIndex}`).value =
          unitPrice > 0 ? unitPrice : "";
        worksheet.getCell(`G${rowIndex}`).numFmt = "#,##0.00";
        worksheet.getCell(`G${rowIndex}`).alignment = {
          horizontal: "right",
          vertical: "top",
        };

        worksheet.getCell(`H${rowIndex}`).value =
          lineTotal > 0 ? lineTotal : "";
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

    worksheet.getCell("B33").value = notes;
    worksheet.getCell("B33").alignment = { wrapText: true, vertical: "top" };

    worksheet.getCell("H31").value = subtotal > 0 ? subtotal : "-";
    if (subtotal > 0) worksheet.getCell("H31").numFmt = "#,##0.00";
    worksheet.getCell("H31").font = { bold: true };

    for (let i = 0; i < 4; i++) {
      const rowIndex = 32 + i;
      const adj = adjustments[i];

      if (adj && adj.label) {
        const val = Number(adj.amount) || 0;
        worksheet.getCell(`G${rowIndex}`).value = adj.label;
        worksheet.getCell(`H${rowIndex}`).value = val !== 0 ? val : "-";
        if (val !== 0) worksheet.getCell(`H${rowIndex}`).numFmt = "#,##0.00";
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

    const vendorSigner = (vendorSignerName || vendorName || "").trim();
    if (vendorSigner) {
      worksheet.getCell("G41").value = vendorSigner.toUpperCase();
      worksheet.getCell("G48").value = `(${vendorSigner})`;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const safeFilename = (poNumber || "Purchase_Order").replace(
      /[/\\?%*:|"<>]/g,
      "_",
    );

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("PO Generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate Purchase Order" },
      { status: 500 },
    );
  }
}
