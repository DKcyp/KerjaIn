import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// POST /api/richzlog/tasklist/[tasklistId]/chat/upload
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ tasklistId: string }> }
) {
  try {
    const { tasklistId: tasklistIdStr } = await ctx.params;
    const tasklistId = Number(tasklistIdStr);

    if (!Number.isFinite(tasklistId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid tasklist ID',
          error: { code: 'INVALID_ID', details: 'Tasklist ID must be a valid number' }
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided',
          error: { code: 'NO_FILE', details: 'File is required' }
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          message: 'File too large',
          error: { code: 'FILE_TOO_LARGE', details: 'Maximum file size is 10MB' }
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid file type',
          error: {
            code: 'INVALID_FILE_TYPE',
            details: 'File type not allowed'
          }
        },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'richzlog', 'chat');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(file.name);
    const fileName = `${timestamp}-${randomStr}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate URL
    const fileUrl = `/uploads/richzlog/chat/${fileName}`;

    // Generate thumbnail for images (optional - can be implemented later)
    let thumbnailUrl = null;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = fileUrl; // For now, use same URL
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl,
        thumbnailUrl
      }
    });
  } catch (error) {
    console.error('POST /api/richzlog/tasklist/[tasklistId]/chat/upload error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: {
          code: 'SERVER_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
