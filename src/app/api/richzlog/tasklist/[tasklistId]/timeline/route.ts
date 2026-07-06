import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/richzlog/tasklist/[tasklistId]/timeline
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ tasklistId: string }> }
) {
  try {
    const { tasklistId: tasklistIdStr } = await ctx.params;
    const tasklistId = Number(tasklistIdStr);

    if (!Number.isFinite(tasklistId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid tasklist ID',
          error: { code: 'INVALID_ID', details: 'Tasklist ID must be a valid number' }
        },
        { status: 400 }
      );
    }

    // Check if tasklist exists
    const tasklist = await prisma.tasklist.findUnique({
      where: { id: tasklistId }
    });

    if (!tasklist) {
      return NextResponse.json(
        {
          success: false,
          message: 'Tasklist not found',
          error: {
            code: 'TASKLIST_NOT_FOUND',
            details: `Tasklist with ID ${tasklistId} does not exist`
          }
        },
        { status: 404 }
      );
    }

    // Get pagination params
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const size = Math.min(100, Math.max(1, Number(searchParams.get('size')) || 20));
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    // Get activities with user info
    const [activities, total] = await Promise.all([
      prisma.taskActivity.findMany({
        where: { taskId: tasklistId },
        orderBy: { createdAt: sortDir },
        skip: (page - 1) * size,
        take: size,
        include: {
          task: {
            select: {
              id: true,
              kode: true,
              status: true
            }
          }
        }
      }),
      prisma.taskActivity.count({
        where: { taskId: tasklistId }
      })
    ]);

    // Get user info for all activities
    const userIds = [...new Set(activities.map(a => a.userId))];
    const users = await prisma.pegawai.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        namaLengkap: true,
        username: true
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Map activities to timeline format
    const items = activities.map(activity => {
      const user = userMap.get(activity.userId);
      const activityInfo = mapActivityToTimeline(activity);

      return {
        id: activity.id,
        tasklistId: activity.taskId,
        activityType: activityInfo.activityType,
        activityCode: activityInfo.activityCode,
        title: activityInfo.title,
        description: activityInfo.description,
        icon: activityInfo.icon,
        color: activityInfo.color,
        userId: activity.userId,
        userName: user?.namaLengkap || 'Unknown User',
        userPhoto: null, // Can be added if photo field exists
        metadata: {
          oldStatus: activity.fromStatus,
          newStatus: activity.toStatus,
          additionalInfo: activity.note,
          ...(activity.metadata as object || {})
        },
        createdAt: activity.createdAt.toISOString(),
        formattedTime: formatTime(activity.createdAt)
      };
    });

    const totalPages = Math.ceil(total / size);

    return NextResponse.json({
      success: true,
      message: 'Timeline retrieved successfully',
      data: {
        items,
        pagination: {
          page,
          size,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('GET /api/richzlog/tasklist/[tasklistId]/timeline error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: {
          code: 'SERVER_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

// Helper function to map activity to timeline format
function mapActivityToTimeline(activity: any) {
  const action = activity.action.toLowerCase();

  // Task creation
  if (action.includes('created') || action === 'task_created') {
    return {
      activityType: 'task_created',
      activityCode: 'TASK_CREATED',
      title: 'Task Created',
      description: activity.note || 'Task has been created',
      icon: 'add_circle',
      color: '#4CAF50'
    };
  }

  // Status change activities
  if (action.includes('start') || activity.toStatus === 'SEDANG_DIPROSES_USER') {
    return {
      activityType: 'status_change',
      activityCode: 'WORK_STARTED',
      title: 'Work Started',
      description: activity.note || 'Task work has been started',
      icon: 'play_circle',
      color: '#1976D2'
    };
  }

  if (action.includes('pause') || activity.toStatus === 'PAUSED') {
    return {
      activityType: 'status_change',
      activityCode: 'WORK_PAUSED',
      title: 'Work Paused',
      description: activity.note || 'Task work has been paused',
      icon: 'pause_circle',
      color: '#F57C00'
    };
  }

  if (action.includes('resume')) {
    return {
      activityType: 'status_change',
      activityCode: 'WORK_RESUMED',
      title: 'Work Resumed',
      description: activity.note || 'Task work has been resumed',
      icon: 'play_circle',
      color: '#1976D2'
    };
  }

  if (action.includes('complete') || activity.toStatus === 'MENUNGGU_REVIEW_PM') {
    return {
      activityType: 'status_change',
      activityCode: 'WORK_COMPLETED',
      title: 'Work Completed',
      description: activity.note || 'Task work has been completed and submitted for review',
      icon: 'check_circle',
      color: '#2E7D32'
    };
  }

  if (action.includes('approve') || activity.toStatus === 'SELESAI') {
    return {
      activityType: 'review_approved',
      activityCode: 'REVIEW_APPROVED',
      title: 'Review Approved',
      description: activity.note || 'Task has been approved',
      icon: 'check_circle',
      color: '#2E7D32'
    };
  }

  if (action.includes('reject') || activity.toStatus === 'REVISI') {
    return {
      activityType: 'review_rejected',
      activityCode: 'REVIEW_REJECTED',
      title: 'Review Rejected',
      description: activity.note || 'Task needs revision',
      icon: 'cancel',
      color: '#C62828'
    };
  }

  if (action.includes('assign')) {
    return {
      activityType: 'assignee_changed',
      activityCode: 'ASSIGNEE_CHANGED',
      title: 'Assignee Changed',
      description: activity.note || 'Task assignee has been changed',
      icon: 'person',
      color: '#7B1FA2'
    };
  }

  if (action.includes('priority')) {
    return {
      activityType: 'priority_changed',
      activityCode: 'PRIORITY_CHANGED',
      title: 'Priority Changed',
      description: activity.note || 'Task priority has been changed',
      icon: 'priority_high',
      color: '#F57C00'
    };
  }

  if (action.includes('deadline') || action.includes('due')) {
    return {
      activityType: 'deadline_changed',
      activityCode: 'DEADLINE_CHANGED',
      title: 'Deadline Changed',
      description: activity.note || 'Task deadline has been changed',
      icon: 'calendar_today',
      color: '#1976D2'
    };
  }

  if (action.includes('comment')) {
    return {
      activityType: 'comment_added',
      activityCode: 'COMMENT_ADDED',
      title: 'Comment Added',
      description: activity.note || 'A comment has been added',
      icon: 'comment',
      color: '#616161'
    };
  }

  // Default activity
  return {
    activityType: 'status_change',
    activityCode: 'STATUS_UPDATED',
    title: activity.action,
    description: activity.note || 'Task status has been updated',
    icon: 'info',
    color: '#616161'
  };
}

// Helper function to format time
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
