// app/api/purchase-orders/meta/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();

    // 1. Fetch all PO records
    const allPOs = await prisma.purchaseOrder.findMany({
      select: { poNumber: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    let highestSeq = 0;
    let latestPONumber = "-";

    if (allPOs.length > 0) {
      latestPONumber = allPOs[0].poNumber;

      // Extract numbers across common PO formats: PO/A190/08/2026, PO-190, 190
      for (const po of allPOs) {
        const match = po.poNumber.match(/(\d+)/g);
        if (match) {
          // If multiple numbers exist (e.g. 190, 08, 2026), take the first sequence number
          const seq = parseInt(match[0], 10);
          if (seq > highestSeq && seq < 2000) {
            // filter out years like 2026
            highestSeq = seq;
          }
        }
      }
    }

    // Default to 190 if no previous POs exist in DB
    const nextSeq = highestSeq > 0 ? highestSeq + 1 : 191;
    const nextPONumber = `PO/A${nextSeq}/${month}/${year}`;

    // 2. Fetch saved Vendors & Projects with addresses
    const [vendors, projects] = await Promise.all([
      prisma.vendor.findMany({ orderBy: { name: "asc" } }),
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
          location: true,
          contactName: true,
          contactPhone: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      latestPONumber,
      nextPONumber,
      vendors,
      projects,
    });
  } catch (error) {
    console.error("Failed to fetch PO metadata:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
