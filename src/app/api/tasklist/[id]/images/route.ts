import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/tasklist/[id]/images
 * Get all images for a specific task
 */
// Ensure table exists
async function ensureImageTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.tasklist_image (
        id SERIAL PRIMARY KEY,
        "taskId" INT NOT NULL,
        "fileName" TEXT NOT NULL,
        "originalName" TEXT NOT NULL,
        "filePath" TEXT NOT NULL,
        "fileType" TEXT NOT NULL,
        "fileSize" INT NOT NULL,
        "uploadedBy" INT,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS tasklist_image_taskId_idx ON public.tasklist_image("taskId");`);
  } catch (e) {
    console.error('Failed to ensure tasklist_image table:', e);
  }
}

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
    const taskId = parseInt(id);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Ensure table exists
    await ensureImageTable();

    // Get images from tasklist_image table
    const images = await prisma.$queryRaw<Array<{
      id: number;
      taskId: number;
      fileName: string;
      originalName: string;
      filePath: string;
      fileType: string;
      fileSize: number;
      uploadedBy: number | null;
      uploadedAt: Date;
    }>>`
      SELECT id, "taskId", "fileName", "originalName", "filePath", "fileType", "fileSize", "uploadedBy", "uploadedAt"
      FROM public.tasklist_image 
      WHERE "taskId" = ${taskId}
      ORDER BY "uploadedAt" ASC
    `;

    // Check for legacy imagePath field (backward compatibility)
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: { imagePath: true, createdAt: true }
    });

    let allImages = [...images];

    // If task has legacy imagePath and it's not already in tasklist_image table, include it
    if (task?.imagePath && !images.some(img => img.filePath === task.imagePath)) {
      // Create a pseudo-entry for legacy image
      allImages.unshift({
        id: -1, // Negative ID to indicate legacy
        taskId: taskId,
        fileName: task.imagePath.split('/').pop() || 'legacy-image',
        originalName: 'Legacy Image',
        filePath: task.imagePath,
        fileType: 'image/png', // Assume PNG for legacy
        fileSize: 0, // Unknown size
        uploadedBy: null,
        uploadedAt: task.createdAt
      });
    }

    return NextResponse.json({ images: allImages });
  } catch (error) {
    console.error('Error fetching task images:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
