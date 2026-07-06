import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// GET /api/blueprint/[id]/documents/[docId]/preview - Preview document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const blueprintId = parseInt(id);
    const documentId = parseInt(docId);

    if (isNaN(blueprintId) || isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint or document ID' },
        { status: 400 }
      );
    }

    // Check if document exists and belongs to the blueprint
    const document = await prisma.blueprintDocument.findFirst({
      where: {
        id: documentId,
        blueprintId: blueprintId
      }
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if file exists on disk
    const filePath = join(process.cwd(), 'public', 'uploads', 'blueprint', document.fileName);
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Set appropriate headers for inline preview (not download)
    const headers = new Headers();
    headers.set('Content-Type', document.fileType);
    headers.set('Content-Disposition', `inline; filename="${document.originalName}"`);
    headers.set('Content-Length', document.fileSize.toString());

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Error previewing document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview document' },
      { status: 500 }
    );
  }
}
