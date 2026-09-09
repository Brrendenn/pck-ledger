// app/api/transactions/[id]/attachments/route.ts
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

// GET: Fetch all attachments for a transaction
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attachments = await prisma.attachment.findMany({
      where: { transactionId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Failed to fetch attachments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Upload a new attachment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is CLIENT (read-only)
    const userRole = (session.user as any)?.role;
    if (userRole === 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden: Read-only access' },
        { status: 403 }
      );
    }

    // Verify transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 5MB)' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(`transactions/${id}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Save to database
    const attachment = await prisma.attachment.create({
      data: {
        transactionId: id,
        url: blob.url,
        filename: file.name,
        filesize: file.size,
        mimetype: file.type,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

// DELETE: Remove an attachment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get attachment to retrieve URL before deleting
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, transactionId: id },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete from Vercel Blob
    try {
      await del(attachment.url);
    } catch (blobError) {
      console.error('Failed to delete from Vercel Blob:', blobError);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await prisma.attachment.delete({
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
