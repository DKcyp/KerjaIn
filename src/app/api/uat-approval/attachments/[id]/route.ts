import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * DELETE /api/uat-approval/attachments/[id]
 * Delete a specific attachment
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN, ADMIN, and PM can delete
    if (!['SUPER_ADMIN', 'ADMIN', 'PM'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const attachmentId = parseInt(id);

    // Get attachment
    const attachment = await prisma.uatAttachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), 'public', attachment.filePath);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Delete from database
    await prisma.uatAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting UAT attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
