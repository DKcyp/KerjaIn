import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/mark-read - Mark a specific notification as read
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, requestId } = body;

    if (!notificationId && !requestId) {
      return NextResponse.json({ error: 'Notification ID or Request ID is required' }, { status: 400 });
    }

    const userId = session.user.id;

    console.log('🔔 [Mark Read API] Request:', { notificationId, requestId, userId });

    // Build where clause
    const whereClause: any = { userId };
    if (notificationId) {
      whereClause.id = notificationId;
    } else if (requestId) {
      whereClause.requestId = requestId;
    }

    // Check if notification exists in database
    const notification = await prisma.notification.findFirst({
      where: whereClause
    });

    if (notification) {
      console.log('✅ [Mark Read API] Found notification:', notification.id);
      
      // Check if this is a task-related notification
      if (notification.taskId) {
        // Verify task still exists
        const taskExists = await prisma.tasklist.findUnique({
          where: { id: notification.taskId },
          select: { id: true }
        });

        if (!taskExists) {
          // Task was deleted, remove the notification instead of marking as read
          console.log(`🗑️ [Mark Read API] Deleting orphaned notification ${notification.id} for deleted task ${notification.taskId}`);
          await prisma.notification.delete({
            where: { id: notification.id }
          });
          return NextResponse.json({ success: true, deleted: true });
        }
      }

      // Task exists or not task-related, mark as read normally
      await prisma.notification.update({
        where: { id: notification.id },
        data: { isRead: true, readAt: new Date() }
      });
      
      console.log('✅ [Mark Read API] Notification marked as read');
    } else {
      console.log('⚠️ [Mark Read API] Notification not found in database');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ [Mark Read API] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
