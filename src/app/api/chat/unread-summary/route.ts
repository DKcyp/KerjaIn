import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chat/unread-summary - Get total unread chat count across all tasks
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all tasks where user is involved (as creator or assignee)
    const userTasks = await prisma.tasklist.findMany({
      where: {
        OR: [
          { pegawaiId: userId }, // User is assignee
          { createdBy: userId }   // User is creator
        ],
        status: { not: 'SELESAI' } // Only active tasks
      },
      select: { id: true }
    });

    const taskIds = userTasks.map(t => t.id);

    if (taskIds.length === 0) {
      return NextResponse.json({ 
        totalUnread: 0,
        tasks: []
      });
    }

    // Count unread messages per task
    const unreadByTask = await prisma.tasklistChat.groupBy({
      by: ['tasklistId'],
      where: {
        tasklistId: { in: taskIds },
        isRead: false,
        senderId: { not: userId } // Don't count own messages
      },
      _count: {
        id: true
      }
    });

    // Get task details for tasks with unread messages
    const tasksWithUnread = await prisma.tasklist.findMany({
      where: {
        id: { in: unreadByTask.map(u => u.tasklistId) }
      },
      select: {
        id: true,
        kode: true,
        keterangan: true,
        projectId: true
      }
    });

    // Get project names
    const projectIds = [...new Set(tasksWithUnread.map(t => t.projectId))];
    const projects = await prisma.proyek.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, namaProyek: true }
    });

    // Map to notification format (one per task)
    const chatNotifications = unreadByTask.map(u => {
      const task = tasksWithUnread.find(t => t.id === u.tasklistId);
      const project = projects.find(p => p.id === task?.projectId);
      
      return {
        id: `chat-${u.tasklistId}`, // Unique ID for notification
        taskId: u.tasklistId,
        taskCode: task?.kode || '',
        taskTitle: task?.keterangan || '',
        projectName: project?.namaProyek || '',
        unreadCount: u._count.id,
        type: 'chat.unread',
        createdAt: new Date().toISOString() // Use current time
      };
    });

    return NextResponse.json({
      notifications: chatNotifications
    });
  } catch (error) {
    console.error('Error getting unread chat summary:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
