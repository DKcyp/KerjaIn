import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();
const db: any = prisma;

// GET /api/backlog/[id]/files
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: idParam } = await params;
    const backlogId = Number(idParam);

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

    // Get files for this backlog
    try {
      const files = await db.$queryRaw`
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

      return NextResponse.json({ files: files || [] });
    } catch (queryError) {
      // Table might not exist yet
      console.log('backlog_files table does not exist yet:', queryError);
      return NextResponse.json({ files: [] });
    }
  } catch (e) {
    console.error('GET /api/backlog/[id]/files error', e);
    return NextResponse.json({ error: 'Failed to fetch backlog files' }, { status: 500 });
  }
}