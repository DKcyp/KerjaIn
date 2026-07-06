import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * External API endpoint for tasklist images/files
 *
 * GET /api/external/tasklist/[id]/images - Get all images/files for a task
 *
 * Authentication: X-API-Key header (EXTERNAL_API_KEY)
 */

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.EXTERNAL_API_KEY;
  if (!validApiKey) {
    console.error('EXTERNAL_API_KEY not configured in environment');
    return false;
  }
  return apiKey === validApiKey;
}

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

// GET /api/external/tasklist/[id]/images
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    await ensureImageTable();

    const images = await prisma.$queryRaw<
      Array<{
        id: number;
        taskId: number;
        fileName: string;
        originalName: string;
        filePath: string;
        fileType: string;
        fileSize: number;
        uploadedBy: number | null;
        uploadedAt: Date;
      }>
    >`
      SELECT id, "taskId", "fileName", "originalName", "filePath", "fileType", "fileSize", "uploadedBy", "uploadedAt"
      FROM public.tasklist_image
      WHERE "taskId" = ${taskId}
      ORDER BY "uploadedAt" ASC
    `;

    // Backward compatibility: include legacy imagePath
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: { imagePath: true, createdAt: true },
    });

    let allImages = [...images];

    if (task?.imagePath && !images.some((img) => img.filePath === task.imagePath)) {
      allImages.unshift({
        id: -1,
        taskId: taskId,
        fileName: task.imagePath.split('/').pop() || 'legacy-image',
        originalName: 'Legacy Image',
        filePath: task.imagePath,
        fileType: 'image/png',
        fileSize: 0,
        uploadedBy: null,
        uploadedAt: task.createdAt,
      });
    }

    return NextResponse.json({ success: true, data: { images: allImages } });
  } catch (error) {
    console.error('Error fetching task images via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch images', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
