import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * External API endpoint for tasklist chat
 *
 * GET  /api/external/tasklist/[id]/chat - Fetch all chat messages for a task
 * POST /api/external/tasklist/[id]/chat - Send a new chat message (with optional file)
 *
 * Authentication: X-API-Key header (EXTERNAL_API_KEY)
 *
 * POST Body (multipart/form-data):
 *   - message: string        // Chat message text
 *   - senderId: number       // Required: ID of the sender (pegawai ID)
 *   - source: string         // Optional: "chat" (default) | "action_note" | "reject" | "approve"
 *   - file: File             // Optional: single file attachment
 *   - files[]: File[]        // Optional: multiple file attachments
 */

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.EXTERNAL_API_KEY;
  if (!validApiKey) {
    console.error('EXTERNAL_API_KEY not configured in environment');
    return false;
  }
  return apiKey === validApiKey;
}

// GET /api/external/tasklist/[id]/chat
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const tasklistId = parseInt(id);
    if (isNaN(tasklistId)) {
      return NextResponse.json({ success: false, error: 'Invalid tasklist ID' }, { status: 400 });
    }

    const tasklist = await prisma.tasklist.findUnique({ where: { id: tasklistId } });
    if (!tasklist) {
      return NextResponse.json({ success: false, error: 'Tasklist not found' }, { status: 404 });
    }

    const chats = await prisma.tasklistChat.findMany({
      where: { tasklistId },
      include: {
        sender: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, data: { chats } });
  } catch (error) {
    console.error('Error fetching tasklist chats via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chats', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/external/tasklist/[id]/chat
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const tasklistId = parseInt(id);
    if (isNaN(tasklistId)) {
      return NextResponse.json({ success: false, error: 'Invalid tasklist ID' }, { status: 400 });
    }

    const tasklist = await prisma.tasklist.findUnique({
      where: { id: tasklistId },
      select: { id: true, kode: true, status: true, projectId: true, pegawaiId: true, createdBy: true },
    });
    if (!tasklist) {
      return NextResponse.json({ success: false, error: 'Tasklist not found' }, { status: 404 });
    }

    if (tasklist.status === 'SELESAI') {
      return NextResponse.json(
        { success: false, error: 'Task is completed. Cannot send messages.' },
        { status: 403 }
      );
    }

    // Parse form data (supports file uploads)
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const senderIdRaw = formData.get('senderId') as string;
    const senderId = senderIdRaw ? Number(senderIdRaw) : null;
    const source = (formData.get('source') as string) || 'chat';
    const file = formData.get('file') as File | null;
    const extraFilesList = formData.getAll('files[]') as File[];

    if (!senderId || !Number.isFinite(senderId)) {
      return NextResponse.json(
        { success: false, error: 'senderId is required and must be a valid number' },
        { status: 400 }
      );
    }

    if ((!message || message.trim().length === 0) && !file && extraFilesList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message or file is required' },
        { status: 400 }
      );
    }

    // Upload helper
    const uploadFile = async (f: File, index = 0) => {
      const bytes = await f.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'chat');
      if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
      const timestamp = Date.now() + index;
      const randomStr = Math.random().toString(36).substring(7);
      const ext = f.name.split('.').pop();
      const uniqueFileName = `chat_${tasklistId}_${timestamp}_${randomStr}.${ext}`;
      await writeFile(join(uploadDir, uniqueFileName), buffer);
      return {
        fileUrl: `/api/uploads/chat/${uniqueFileName}`,
        fileName: f.name,
        fileType: f.type,
        fileSize: f.size,
      };
    };

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      const uploaded = await uploadFile(file, 0);
      fileUrl = uploaded.fileUrl;
      fileName = uploaded.fileName;
      fileType = uploaded.fileType;
      fileSize = uploaded.fileSize;
    }

    type ExtraFile = { fileUrl: string; fileName: string; fileType: string; fileSize: number };
    const extraFilesData: ExtraFile[] = [];
    for (let i = 0; i < extraFilesList.length; i++) {
      const ef = extraFilesList[i];
      const uploaded = await uploadFile(ef, i + 1);
      if (i === 0 && !fileUrl) {
        fileUrl = uploaded.fileUrl;
        fileName = uploaded.fileName;
        fileType = uploaded.fileType;
        fileSize = uploaded.fileSize;
      } else {
        extraFilesData.push(uploaded);
      }
    }

    const chat = await prisma.tasklistChat.create({
      data: {
        tasklistId,
        senderId,
        message: message?.trim() || '',
        fileUrl,
        fileName,
        fileType,
        fileSize,
        extraFiles: extraFilesData.length > 0 ? extraFilesData : [],
        source,
      },
      include: {
        sender: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: { chat } }, { status: 201 });
  } catch (error) {
    console.error('Error sending chat via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
