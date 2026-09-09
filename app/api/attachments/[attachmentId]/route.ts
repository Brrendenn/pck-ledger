import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { attachmentId } = await params;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 },
    );
  }

  // Add your project/client authorization check here.

  const blob = await get(attachment.url, {
    access: "private",
  });

  if (!blob) {
    return NextResponse.json(
      { error: "File not found in Blob storage" },
      { status: 404 },
    );
  }

  return new Response(blob.stream, {
    headers: {
      "Content-Type": attachment.mimetype,
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        attachment.filename,
      )}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
