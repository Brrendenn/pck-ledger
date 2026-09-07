// app/api/invoices/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { z } from "zod";

const invoiceSchema = z.object({
  invoiceNo: z.string().min(1, "Nomor invoice wajib diisi"),
  recipientComp: z.string().min(1, "Nama perusahaan wajib diisi"),
  recipientAttn: z.string().min(1, "Up/Attn wajib diisi"),
  projectTitle: z.string().min(1, "Judul proyek wajib diisi"),
  description: z.string().min(1, "Deskripsi wajib diisi"),
  qty: z.string().min(1).default("1"), // Free text
  unit: z.string().optional().default(""),
  price: z.number().nonnegative(),
  accountNumber: z.string().min(1),
  accountName: z.string().min(1),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
    });

    const latestInvoice = await prisma.invoice.findFirst({
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });

    return NextResponse.json({
      invoices,
      nextSequence: (latestInvoice?.sequence ?? 145) + 1,
    });
  } catch (error) {
    console.error("Gagal mengambil data invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const parsed = invoiceSchema.parse(body);

    const latestInvoice = await prisma.invoice.findFirst({
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    const nextSequence = (latestInvoice?.sequence ?? 145) + 1;

    // Hitung total: Deteksi apakah qty berupa persentase (misal: "30%") atau angka biasa
    let multiplier = 1;
    const cleanQty = parsed.qty.trim();
    if (cleanQty.endsWith("%")) {
      const pct = parseFloat(cleanQty.replace("%", ""));
      multiplier = isNaN(pct) ? 1 : pct / 100;
    } else {
      const num = parseFloat(cleanQty);
      multiplier = isNaN(num) ? 1 : num;
    }

    const totalAmount = multiplier * parsed.price;

    const savedInvoice = await prisma.invoice.create({
      data: {
        sequence: nextSequence,
        invoiceNo: parsed.invoiceNo.trim(),
        recipientComp: parsed.recipientComp.trim(),
        recipientAttn: parsed.recipientAttn.trim(),
        projectTitle: parsed.projectTitle.trim(),
        description: parsed.description.trim(),
        qty: parsed.qty.trim(),
        unit: parsed.unit?.trim() || null,
        price: parsed.price,
        totalAmount,
        accountNumber: parsed.accountNumber.trim(),
        accountName: parsed.accountName.trim(),
      },
    });

    return NextResponse.json(savedInvoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("Gagal menyimpan invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}