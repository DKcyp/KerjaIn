import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, hasPermission } from '@/lib/auth';
import { updateAllTaskDueDates, updateTaskDueDate } from '@/lib/taskDueDateCalculator';

// POST /api/tasklist/calculate-due-dates - Calculate due dates for tasks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - require system.update permission
    if (!(await hasPermission(session.user.id, 'system.update'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { taskId } = body;

    let result;
    if (taskId) {
      // Update specific task
      const success = await updateTaskDueDate(parseInt(taskId));
      result = { 
        success, 
        message: success ? 'Task due date updated successfully' : 'Failed to update task due date',
        updatedCount: success ? 1 : 0
      };
    } else {
      // Update all tasks
      const updatedCount = await updateAllTaskDueDates();
      result = { 
        success: true, 
        message: `Successfully updated ${updatedCount} task due dates`,
        updatedCount
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calculating due dates:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/tasklist/calculate-due-dates - Get calculation status/info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!(await hasPermission(session.user.id, 'system.read'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { prisma } = await import('@/lib/prisma');

    // Get statistics
    const totalTasks = await prisma.tasklist.count();
    const tasksWithDueDate = await prisma.tasklist.count({
      where: { calculatedDueDate: { not: null } }
    });
    const tasksWithoutDueDate = totalTasks - tasksWithDueDate;

    // Get overdue tasks count
    const now = new Date();
    const overdueTasks = await prisma.tasklist.count({
      where: {
        calculatedDueDate: { lt: now },
        status: { not: 'SELESAI' }
      }
    });

    return NextResponse.json({
      totalTasks,
      tasksWithDueDate,
      tasksWithoutDueDate,
      overdueTasks,
      calculationNeeded: tasksWithoutDueDate > 0
    });
  } catch (error) {
    console.error('Error getting due date calculation info:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
