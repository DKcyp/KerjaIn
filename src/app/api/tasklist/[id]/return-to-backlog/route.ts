import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromRequest } from '@/lib/auth';

// POST /api/tasklist/[id]/return-to-backlog
// Return a task created from backlog back to backlog
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const taskId = Number(idStr);
    
    if (!Number.isFinite(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Get session
    const session = parseSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get task
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        kode: true,
        sourceBacklogId: true,
        status: true,
        pegawaiId: true,
        projectId: true,
        createdBy: true,
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task is from backlog
    if (!task.sourceBacklogId) {
      return NextResponse.json(
        { error: 'This task is not from backlog' },
        { status: 400 }
      );
    }

    // Check permission: only creator or PM can return
    const isCreator = task.createdBy === session.id;
    const isPM = session.role === 'PM' || session.role === 'SUPER_ADMIN';

    if (!isCreator && !isPM) {
      return NextResponse.json(
        { error: 'You do not have permission to return this task' },
        { status: 403 }
      );
    }

    // Return task to backlog: unassign and reset status
    await prisma.$executeRaw`
      UPDATE "tasklist" 
      SET 
        "pegawaiId" = NULL,
        "status" = 'MENUNGGU_PROSES_USER',
        "started_at" = NULL,
        "paused_at" = NULL,
        "total_duration_minutes" = 0,
        "updatedAt" = NOW()
      WHERE id = ${taskId}
    `;

    // Also reset backlog assignment
    await prisma.backlog.updateMany({
      where: { tasklistId: taskId },
      data: {
        assignedTo: null,
        tasklistId: null
      }
    });

    // Log the action
    await prisma.taskActivity.create({
      data: {
        taskId: taskId,
        userId: session.id,
        action: 'RETURNED_TO_BACKLOG',
        note: `Task dikembalikan ke backlog oleh ${session.role === 'PM' ? 'PM' : 'creator'}`,
        metadata: {
          backlogId: task.sourceBacklogId,
          previousStatus: task.status,
          previousAssignee: task.pegawaiId,
        }
      }
    });

    console.log(`✅ Task ${task.kode} returned to backlog by user ${session.id}`);

    return NextResponse.json({
      success: true,
      message: 'Task berhasil dikembalikan ke backlog',
      data: {
        taskId: taskId,
        backlogId: task.sourceBacklogId,
      }
    });

  } catch (error) {
    console.error('[Return to Backlog] Error:', error);
    return NextResponse.json(
      { error: 'Failed to return task to backlog' },
      { status: 500 }
    );
  }
}
