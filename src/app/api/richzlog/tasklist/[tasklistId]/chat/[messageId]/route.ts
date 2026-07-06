import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/richzlog/tasklist/[tasklistId]/chat/[messageId]
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ tasklistId: string; messageId: string }> }
) {
  try {
    const { tasklistId: tasklistIdStr, messageId: messageIdStr } = await ctx.params;
    const tasklistId = Number(tasklistIdStr);
    const messageId = Number(messageIdStr);

    if (!Number.isFinite(tasklistId) || !Number.isFinite(messageId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid ID',
          error: { code: 'INVALID_ID', details: 'IDs must be valid numbers' }
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { message } = body;

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

    // TODO: Get userId from session/auth
    const userId = 1; // Temporary hardcoded

    const existingMessage = await prisma.tasklistChat.findUnique({
      where: { id: messageId }
    });

    if (!existingMessage) {
      return NextResponse.json(
        {
          success: false,
          message: 'Message not found',
          error: { code: 'MESSAGE_NOT_FOUND', details: 'Message does not exist' }
        },
        { status: 404 }
      );
    }

    if (existingMessage.tasklistId !== tasklistId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Message does not belong to this tasklist',
          error: { code: 'INVALID_MESSAGE', details: 'Message ID mismatch' }
        },
        { status: 400 }
      );
    }

    // Check if user owns the message
    if (existingMessage.senderId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED', details: 'You can only edit your own messages' }
        },
        { status: 403 }
      );
    }

    const updatedMessage = await prisma.tasklistChat.update({
      where: { id: messageId },
      data: {
        message: message.trim(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        id: updatedMessage.id,
        message: updatedMessage.message,
        isEdited: true,
        updatedAt: updatedMessage.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('PUT /api/richzlog/tasklist/[tasklistId]/chat/[messageId] error:', error);
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

// DELETE /api/richzlog/tasklist/[tasklistId]/chat/[messageId]
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ tasklistId: string; messageId: string }> }
) {
  try {
    const { tasklistId: tasklistIdStr, messageId: messageIdStr } = await ctx.params;
    const tasklistId = Number(tasklistIdStr);
    const messageId = Number(messageIdStr);

    if (!Number.isFinite(tasklistId) || !Number.isFinite(messageId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid ID',
          error: { code: 'INVALID_ID', details: 'IDs must be valid numbers' }
        },
        { status: 400 }
      );
    }

    // TODO: Get userId from session/auth
    const userId = 1; // Temporary hardcoded

    const existingMessage = await prisma.tasklistChat.findUnique({
      where: { id: messageId }
    });

    if (!existingMessage) {
      return NextResponse.json(
        {
          success: false,
          message: 'Message not found',
          error: { code: 'MESSAGE_NOT_FOUND', details: 'Message does not exist' }
        },
        { status: 404 }
      );
    }

    if (existingMessage.tasklistId !== tasklistId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Message does not belong to this tasklist',
          error: { code: 'INVALID_MESSAGE', details: 'Message ID mismatch' }
        },
        { status: 400 }
      );
    }

    // Check if user owns the message
    if (existingMessage.senderId !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED', details: 'You can only delete your own messages' }
        },
        { status: 403 }
      );
    }

    // Soft delete by updating message content
    await prisma.tasklistChat.update({
      where: { id: messageId },
      data: {
        message: '[Message deleted]',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        id: messageId,
        isDeleted: true,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('DELETE /api/richzlog/tasklist/[tasklistId]/chat/[messageId] error:', error);
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
