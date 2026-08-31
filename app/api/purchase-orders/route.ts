// app/api/purchase-orders/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        project: { select: { id: true, name: true, company: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error('Failed to fetch purchase orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing PO ID' }, { status: 400 });
    }

    await prisma.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete PO:', error);
    return NextResponse.json({ error: 'Failed to delete PO' }, { status: 500 });
  }
}