// app/api/purchase-orders/[id]/attachments/route.ts
import { put, del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

// GET: Fetch all attachments for a purchase order
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attachments = await prisma.pOAttachment.findMany({
      where: { poId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Failed to fetch PO attachments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Upload a new attachment to a purchase order
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole === 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden: Read-only access' },
        { status: 403 }
      );
    }

    // Verify purchase order exists
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
    });

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 5MB)' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`purchase-orders/${params.id}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Save to database
    const attachment = await prisma.pOAttachment.create({
      data: {
        poId: params.id,
        url: blob.url,
        filename: file.name,
        filesize: file.size,
        mimetype: file.type,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('PO upload failed:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a purchase order attachment
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole === 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden: Read-only access' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'attachmentId is required' },
        { status: 400 }
      );
    }

    const attachment = await prisma.pOAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    try {
      await del(attachment.url);
    } catch (blobError) {
      console.error('Failed to delete from Vercel Blob:', blobError);
    }

    await prisma.pOAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete failed:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    );
  }
}
