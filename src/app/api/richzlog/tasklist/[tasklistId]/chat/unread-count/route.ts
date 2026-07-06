import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/richzlog/tasklist/[tasklistId]/chat/unread-count
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

    // Get unread count and last message
    const [unreadCount, lastMessage] = await Promise.all([
      prisma.tasklistChat.count({
        where: {
          tasklistId,
          isRead: false
        }
      }),
      prisma.tasklistChat.findFirst({
        where: { tasklistId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: {
        tasklistId,
        unreadCount,
        lastMessageAt: lastMessage?.createdAt.toISOString() || null
      }
    });
  } catch (error) {
    console.error('GET /api/richzlog/tasklist/[tasklistId]/chat/unread-count error:', error);
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
