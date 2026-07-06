import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/richzlog/tasklist/[tasklistId]/chat
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
    const size = Math.min(100, Math.max(1, Number(searchParams.get('size')) || 50));
    const before = searchParams.get('before');
    const after = searchParams.get('after');

    // Build where clause
    const where: any = { tasklistId };
    
    if (before) {
      where.createdAt = { lt: new Date(before) };
    } else if (after) {
      where.createdAt = { gt: new Date(after) };
    }

    // Get messages with sender info
    const [messages, total] = await Promise.all([
      prisma.tasklistChat.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
        include: {
          sender: {
            select: {
              id: true,
              namaLengkap: true,
              username: true,
              role: true
            }
          }
        }
      }),
      prisma.tasklistChat.count({ where })
    ]);

    // Map messages to response format
    const items = messages.map(msg => ({
      id: msg.id,
      tasklistId: msg.tasklistId,
      userId: msg.senderId,
      userName: msg.sender.namaLengkap,
      userPhoto: null,
      userRole: msg.sender.role,
      message: msg.message,
      messageType: msg.fileUrl ? 'file' : 'text',
      attachments: msg.fileUrl ? [{
        id: msg.id,
        fileName: msg.fileName || 'file',
        fileSize: msg.fileSize || 0,
        fileType: msg.fileType || 'application/octet-stream',
        fileUrl: msg.fileUrl,
        thumbnailUrl: null
      }] : [],
      replyTo: null,
      isEdited: false,
      isDeleted: false,
      reactions: [],
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
      formattedTime: formatTime(msg.createdAt)
    }));

    const totalPages = Math.ceil(total / size);
    const unreadCount = await prisma.tasklistChat.count({
      where: { tasklistId, isRead: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Chat messages retrieved successfully',
      data: {
        items,
        pagination: {
          page,
          size,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('GET /api/richzlog/tasklist/[tasklistId]/chat error:', error);
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

// POST /api/richzlog/tasklist/[tasklistId]/chat
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
    const { message, messageType = 'text', replyToMessageId, attachments = [] } = body;

    if (!message || message.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Message is required',
          error: { code: 'INVALID_INPUT', details: 'Message cannot be empty' }
        },
        { status: 400 }
      );
    }

    // For now, use a dummy user ID (should be from auth session)
    const senderId = 1;

    // Create chat message
    const chatMessage = await prisma.tasklistChat.create({
      data: {
        tasklistId,
        senderId,
        message: message.trim(),
        fileUrl: attachments[0]?.fileUrl || null,
        fileName: attachments[0]?.fileName || null,
        fileType: attachments[0]?.fileType || null,
        fileSize: attachments[0]?.fileSize || null
      },
      include: {
        sender: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        id: chatMessage.id,
        tasklistId: chatMessage.tasklistId,
        userId: chatMessage.senderId,
        userName: chatMessage.sender.namaLengkap,
        userPhoto: null,
        userRole: chatMessage.sender.role,
        message: chatMessage.message,
        messageType: chatMessage.fileUrl ? 'file' : 'text',
        attachments: chatMessage.fileUrl ? [{
          id: chatMessage.id,
          fileName: chatMessage.fileName || 'file',
          fileSize: chatMessage.fileSize || 0,
          fileType: chatMessage.fileType || 'application/octet-stream',
          fileUrl: chatMessage.fileUrl,
          thumbnailUrl: null
        }] : [],
        replyTo: null,
        isEdited: false,
        isDeleted: false,
        reactions: [],
        createdAt: chatMessage.createdAt.toISOString(),
        updatedAt: chatMessage.updatedAt.toISOString(),
        formattedTime: formatTime(chatMessage.createdAt)
      }
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/richzlog/tasklist/[tasklistId]/chat error:', error);
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

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
