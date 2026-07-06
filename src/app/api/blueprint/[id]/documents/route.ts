import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/blueprint/[id]/documents - Upload document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blueprintId = parseInt(id);

    if (isNaN(blueprintId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

    // Check if blueprint exists
    const existingBlueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId }
    });

    if (!existingBlueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const uploadedBy = parseInt(formData.get('uploadedBy') as string);
    const notes = formData.get('notes') as string;
    const version = formData.get('version') as string || '1.0';
    const groupName = formData.get('groupName') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!uploadedBy || isNaN(uploadedBy)) {
      return NextResponse.json(
        { success: false, error: 'Invalid uploader ID' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PDF, DOCX, and XLSX files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size too large. Maximum size is 10MB' },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'blueprint');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const fileExtension = originalName.split('.').pop();
    const fileName = `blueprint_${blueprintId}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save document record to database
    const document = await prisma.blueprintDocument.create({
      data: {
        blueprintId,
        fileName,
        originalName,
        fileSize: file.size,
        fileType: file.type,
        groupName: groupName || null,
        version,
        uploadedBy,
        notes: notes || null
      }
    });

    // Add activity log
    await prisma.blueprintActivityLog.create({
      data: {
        blueprintId,
        userId: uploadedBy,
        action: 'UPLOAD_DOCUMENT',
        description: `Document uploaded: ${originalName}`,
        notes: notes || null
      }
    });

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document uploaded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// GET /api/blueprint/[id]/documents - Get all documents for a blueprint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blueprintId = parseInt(id);

    if (isNaN(blueprintId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

    const documents = await prisma.blueprintDocument.findMany({
      where: { blueprintId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
