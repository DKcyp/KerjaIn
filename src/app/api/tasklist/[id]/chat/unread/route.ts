import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/tasklist/[id]/chat/unread - Get unread chat count for a task
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);
    if (!taskId || isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Count unread messages for this task where current user is NOT the sender
    const unreadCount = await prisma.tasklistChat.count({
      where: {
        tasklistId: taskId,
        isRead: false,
        senderId: { not: session.user.id } // Don't count own messages
      }
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('Error getting unread chat count:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/tasklist/[id]/chat/unread - Mark all messages as read
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);
    if (!taskId || isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Mark all messages as read for this task (except own messages)
    await prisma.tasklistChat.updateMany({
      where: {
        tasklistId: taskId,
        isRead: false,
        senderId: { not: session.user.id }
      },
      data: {
        isRead: true
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking chat as read:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
