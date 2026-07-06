import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/cleanup - Remove orphaned notifications for deleted tasks
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Get all task-related notifications for this user
        const notifications = await prisma.notification.findMany({
            where: {
                userId: userId,
                taskId: { not: null }
            },
            select: {
                id: true,
                taskId: true
            }
        });

        console.log(`🧹 [Cleanup] Found ${notifications.length} task notifications for user ${userId}`);

        // Check which tasks still exist
        const taskIds = notifications.map(n => n.taskId).filter((id): id is number => id !== null);
        const existingTasks = await prisma.tasklist.findMany({
            where: { id: { in: taskIds } },
            select: { id: true }
        });

        const existingTaskIds = new Set(existingTasks.map(t => t.id));

        // Find orphaned notifications (task doesn't exist)
        const orphanedNotifications = notifications.filter(n =>
            n.taskId !== null && !existingTaskIds.has(n.taskId)
        );

        console.log(`🗑️ [Cleanup] Found ${orphanedNotifications.length} orphaned notifications`);

        if (orphanedNotifications.length > 0) {
            // Delete orphaned notifications
            const orphanedIds = orphanedNotifications.map(n => n.id);
            const result = await prisma.notification.deleteMany({
                where: {
                    id: { in: orphanedIds },
                    userId: userId // Safety check
                }
            });

            console.log(`✅ [Cleanup] Deleted ${result.count} orphaned notifications`);

            return NextResponse.json({
                success: true,
                deleted: result.count,
                message: `Removed ${result.count} notification(s) for deleted tasks`
            });
        }

        return NextResponse.json({
            success: true,
            deleted: 0,
            message: 'No orphaned notifications found'
        });
    } catch (error) {
        console.error('❌ [Cleanup] Error cleaning up notifications:', error);
        return NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
