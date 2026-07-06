import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * POST /api/uat-approval/[id]/attachments
 * Upload multiple attachments for UAT approval
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN, ADMIN, and PM can upload
    if (!['SUPER_ADMIN', 'ADMIN', 'PM'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const approvalId = parseInt(id);

    // Check if approval exists
    const approval = await prisma.uatApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      return NextResponse.json(
        { error: 'UAT Approval not found' },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'uat-attachments');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedAttachments = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const ext = path.extname(file.name);
      const fileName = `uat_${approvalId}_${timestamp}_${randomStr}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      // Save file
      await writeFile(filePath, buffer);

      // Save to database
      const attachment = await prisma.uatAttachment.create({
        data: {
          uatApprovalId: approvalId,
          fileName,
          originalName: file.name,
          filePath: `/uploads/uat-attachments/${fileName}`,
          fileType: file.type,
          fileSize: file.size,
          uploadedBy: user.id,
        },
      });

      uploadedAttachments.push(attachment);
    }

    return NextResponse.json({
      message: 'Files uploaded successfully',
      attachments: uploadedAttachments,
    });
  } catch (error) {
    console.error('Error uploading UAT attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/uat-approval/[id]/attachments
 * Get all attachments for a UAT approval
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const approvalId = parseInt(id);

    const attachments = await prisma.uatAttachment.findMany({
      where: { uatApprovalId: approvalId },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Error fetching UAT attachments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
