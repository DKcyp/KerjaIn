import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const type = formData.get('type') as string; // 'uat' or 'userguide'

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files provided'
      }, { status: 400 });
    }

    // Validate type
    if (!['uat', 'userguide'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Must be "uat" or "userguide"'
      }, { status: 400 });
    }

    // For UAT files, only allow 1 file
    if (type === 'uat' && files.length > 1) {
      return NextResponse.json({
        success: false,
        error: 'Only one UAT file is allowed'
      }, { status: 400 });
    }

    const uploadedFiles: string[] = [];
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'eut', type);

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${originalName}`;
      const filepath = join(uploadDir, filename);

      // Write file
      await writeFile(filepath, buffer);

      // Store relative path for database
      const relativePath = `/api/uploads/eut/${type}/${filename}`;
      uploadedFiles.push(relativePath);
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload files'
    }, { status: 500 });
  }
}
