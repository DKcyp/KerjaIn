import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();
const db: any = prisma;

// POST /api/backlog/[id]/copy-files-to-task
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: idParam } = await params;
    const backlogId = Number(idParam);
    const body = await req.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    // Check if backlog exists and user has access
    const backlog = await db.backlog.findFirst({ 
      where: { 
        id: backlogId, 
        isDeleted: false,
        OR: [
          { createdBy: session.user.id },
          { assignedTo: session.user.id }
        ]
      } 
    });
    
    if (!backlog) {
      return NextResponse.json({ error: 'Backlog not found or access denied' }, { status: 404 });
    }

    // Check if task exists
    const task = await db.tasklist.findFirst({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get files from backlog
    let backlogFiles: any[] = [];
    try {
      backlogFiles = await db.$queryRaw`
        SELECT 
          id,
          "fileName",
          "originalName", 
          "filePath",
          "fileType",
          "fileSize",
          "uploadedBy",
          "uploadedAt"
        FROM public.backlog_files 
        WHERE "backlogId" = ${backlogId}
        ORDER BY "uploadedAt" DESC
      `;
    } catch (queryError) {
      console.log('backlog_files table does not exist yet:', queryError);
      return NextResponse.json({ copiedFiles: 0, message: 'No files to copy' });
    }

    if (backlogFiles.length === 0) {
      return NextResponse.json({ copiedFiles: 0, message: 'No files to copy' });
    }

    // Ensure tasklist_image table exists
    try {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS public.tasklist_image (
          id SERIAL PRIMARY KEY,
          "taskId" INTEGER NOT NULL,
          "fileName" VARCHAR(255) NOT NULL,
          "originalName" VARCHAR(255) NOT NULL,
          "filePath" VARCHAR(500) NOT NULL,
          "fileType" VARCHAR(100) NOT NULL,
          "fileSize" INTEGER NOT NULL,
          "uploadedBy" INTEGER,
          "uploadedAt" TIMESTAMP DEFAULT NOW()
        )
      `;
    } catch (tableError) {
      console.error('Failed to ensure tasklist_image table:', tableError);
    }

    const copiedFiles: any[] = [];
    const backlogUploadsDir = join(process.cwd(), 'public', 'uploads', 'backlog');
    const tasklistUploadsDir = join(process.cwd(), 'public', 'uploads', 'tasklist');

    // Ensure tasklist uploads directory exists
    try {
      await mkdir(tasklistUploadsDir, { recursive: true });
    } catch (mkdirError) {
      console.error('Failed to create tasklist uploads directory:', mkdirError);
    }

    // Copy each file
    for (const file of backlogFiles) {
      try {
        // Extract filename from backlog file path
        const backlogFileName = file.fileName;
        const sourceFilePath = join(backlogUploadsDir, backlogFileName);
        
        // Check if source file exists
        try {
          await stat(sourceFilePath);
        } catch (statError) {
          console.error(`Source file not found: ${sourceFilePath}`);
          continue; // Skip this file
        }

        // Generate new filename for tasklist
        const ext = backlogFileName.includes('.') ? `.${backlogFileName.split('.').pop()}` : '';
        const newFileName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
        const destFilePath = join(tasklistUploadsDir, newFileName);

        // Copy file
        const fileBuffer = await readFile(sourceFilePath);
        await writeFile(destFilePath, fileBuffer);

        // Verify copied file
        const destStats = await stat(destFilePath);
        if (destStats.size === 0) {
          console.error(`Failed to copy file: ${backlogFileName}`);
          continue;
        }

        // Insert into tasklist_image table
        await db.$executeRaw`
          INSERT INTO public.tasklist_image ("taskId", "fileName", "originalName", "filePath", "fileType", "fileSize", "uploadedBy", "uploadedAt")
          VALUES (${taskId}, ${newFileName}, ${file.originalName}, ${`/api/uploads/tasklist/${newFileName}`}, ${file.fileType}, ${file.fileSize}, ${session.user.id}, NOW())
        `;

        copiedFiles.push({
          originalFileName: file.fileName,
          newFileName: newFileName,
          originalName: file.originalName,
          fileSize: file.fileSize,
          fileType: file.fileType
        });

        console.log(`✅ Copied file: ${file.originalName} -> ${newFileName}`);
      } catch (copyError) {
        console.error(`Failed to copy file ${file.fileName}:`, copyError);
        // Continue with other files
      }
    }

    return NextResponse.json({ 
      copiedFiles: copiedFiles.length,
      totalFiles: backlogFiles.length,
      files: copiedFiles,
      message: `Successfully copied ${copiedFiles.length} out of ${backlogFiles.length} files to task`
    });

  } catch (e) {
    console.error('POST /api/backlog/[id]/copy-files-to-task error', e);
    return NextResponse.json({ error: 'Failed to copy files to task' }, { status: 500 });
  }
}