import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/backlog/[id]/task - Check if backlog has associated task
export async function GET(
  _req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const backlogId = parseInt(idParam);
    if (!Number.isFinite(backlogId)) {
      return NextResponse.json({ error: 'Invalid backlog ID' }, { status: 400 });
    }

    // Get backlog details
    const backlog = await prisma.backlog.findFirst({
      where: { id: backlogId, isDeleted: false }
    });

    if (!backlog) {
      return NextResponse.json({ error: 'Backlog not found' }, { status: 404 });
    }

    // Find associated task based on tasklistId first, then fallback to content matching
    let associatedTasks: any[] = [];
    
    // Check if backlog has tasklistId field (after migration)
    const backlogWithTasklistId = backlog as any;
    
    if (backlogWithTasklistId.tasklistId) {
      // Direct lookup using tasklistId
      const directTask = await prisma.tasklist.findUnique({
        where: { id: backlogWithTasklistId.tasklistId },
        select: {
          id: true,
          kode: true,
          keterangan: true,
          status: true,
          scheduleAt: true,
          createdAt: true,
          taskComplexity: true,
        }
      });
      
      if (directTask) {
        associatedTasks = [directTask];
      }
    } else if (backlog.assignedTo) {
      // Fallback to content-based matching for legacy data
      const whereClause: any = {
        pegawaiId: backlog.assignedTo,
        // Look for tasks with similar content (backlog note in keterangan)
        OR: [
          { keterangan: { contains: backlog.note, mode: 'insensitive' } },
          // Or tasks created around the same time as backlog assignment
          {
            AND: [
              { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Last 24 hours
            ]
          }
        ]
      };
      
      // Add project and module filters if they exist
      if (backlog.projectId) whereClause.projectId = backlog.projectId;
      if (backlog.moduleId) whereClause.moduleId = backlog.moduleId;
      
      associatedTasks = await prisma.tasklist.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          kode: true,
          keterangan: true,
          status: true,
          scheduleAt: true,
          createdAt: true,
          taskComplexity: true,
        }
      });
    }

    return NextResponse.json({
      backlog: {
        id: backlog.id,
        title: backlog.title,
        assignedTo: backlog.assignedTo,
        tasklistId: backlogWithTasklistId.tasklistId || null,
        projectId: backlog.projectId,
        moduleId: backlog.moduleId,
      },
      associatedTasks,
      hasTask: associatedTasks.length > 0
    });
  } catch (error) {
    console.error('GET /api/backlog/[id]/task error:', error);
    return NextResponse.json({ error: 'Failed to check task association' }, { status: 500 });
  }
}