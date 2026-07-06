import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/richzlog/tasklist/[tasklistId]/chat/read
export async function POST(
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

    const body = await req.json();
    const { messageIds } = body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid message IDs',
          error: { code: 'INVALID_INPUT', details: 'messageIds must be a non-empty array' }
        },
        { status: 400 }
      );
    }

    // Mark messages as read
    const result = await prisma.tasklistChat.updateMany({
      where: {
        id: { in: messageIds },
        tasklistId
      },
      data: {
        isRead: true
      }
    });

    // Get remaining unread count
    const unreadCount = await prisma.tasklistChat.count({
      where: {
        tasklistId,
        isRead: false
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read',
      data: {
        markedCount: result.count,
        unreadCount
      }
    });
  } catch (error) {
    console.error('POST /api/richzlog/tasklist/[tasklistId]/chat/read error:', error);
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
