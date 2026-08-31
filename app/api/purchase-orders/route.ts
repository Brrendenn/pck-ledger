// app/api/purchase-orders/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        project: { select: { id: true, name: true, location: true } },
        items: { orderBy: { itemIndex: "asc" } },
        adjustments: { orderBy: { adjustmentIndex: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

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

    // 3. Auto-save Project Preset details
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

    // 4. Upsert Purchase Order in Database
    const savedPO = await prisma.purchaseOrder.upsert({
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

    return NextResponse.json(savedPO, { status: 201 });
  } catch (error) {
    console.error("Failed to create purchase order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
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

    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete PO:", error);
    return NextResponse.json({ error: "Failed to delete PO" }, { status: 500 });
  }
}
