import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { getPusherServer } from '@/lib/pusher-server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// GET - Fetch all chat messages for a tasklist
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const tasklistId = parseInt(id);

    if (isNaN(tasklistId)) {
      return NextResponse.json({ error: 'Invalid tasklist ID' }, { status: 400 });
    }

    // Verify tasklist exists
    const tasklist = await prisma.tasklist.findUnique({
      where: { id: tasklistId }
    });

    if (!tasklist) {
      return NextResponse.json({ error: 'Tasklist not found' }, { status: 404 });
    }

    // Fetch all chat messages for this tasklist
    const chats = await prisma.tasklistChat.findMany({
      where: { tasklistId },
      include: {
        sender: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching tasklist chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST - Send a new chat message (with optional file)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 [CHAT POST] Starting chat message send...');
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: Session validation
    console.log('📍 [STEP 1/8] Validating session...');
    const cookieHeader = req.headers.get('cookie');
    console.log('🍪 Cookie header present:', !!cookieHeader);

    const session = parseSessionFromCookieHeader(cookieHeader);
    if (session) {
      console.log('✅ Session validated:', {
        userId: session.id,
        username: session.username,
        role: session.role,
        namaLengkap: session.namaLengkap
      });
    } else {
      console.error('❌ [STEP 1/8] Session validation failed - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Parse task ID
    console.log('📍 [STEP 2/8] Parsing task ID...');
    const { id } = await params;
    const tasklistId = parseInt(id);
    console.log('📋 Task ID:', tasklistId, '(type:', typeof tasklistId, ')');

    if (isNaN(tasklistId)) {
      console.error('❌ [STEP 2/8] Invalid task ID:', id);
      return NextResponse.json({ error: 'Invalid tasklist ID' }, { status: 400 });
    }
    console.log('✅ [STEP 2/8] Task ID parsed successfully');

    // Step 3: Verify tasklist exists and check status
    console.log('📍 [STEP 3/8] Fetching tasklist from database...');
    const tasklist = await prisma.tasklist.findUnique({
      where: { id: tasklistId },
      select: {
        id: true,
        kode: true,
        status: true,
        projectId: true,
        pegawaiId: true,
        createdBy: true
      }
    });

    if (tasklist) {
      console.log('✅ [STEP 3/8] Tasklist found:', {
        id: tasklist.id,
        kode: tasklist.kode,
        status: tasklist.status,
        projectId: tasklist.projectId,
        pegawaiId: tasklist.pegawaiId,
        createdBy: tasklist.createdBy
      });
    } else {
      console.error('❌ [STEP 3/8] Tasklist not found for ID:', tasklistId);
      return NextResponse.json({ error: 'Tasklist not found' }, { status: 404 });
    }

    // Check if task is completed
    if (tasklist.status === 'SELESAI') {
      console.error('❌ [STEP 3/8] Task already completed, chat not allowed');
      return NextResponse.json({
        error: 'Task sudah selesai, Anda tidak dapat mengirim pesan'
      }, { status: 403 });
    }
    console.log('✅ [STEP 3/8] Task status check passed');

    // Step 4: Parse form data
    console.log('📍 [STEP 4/8] Parsing form data...');
    const formData = await req.formData();

    // Log all form data keys
    const formDataKeys = Array.from(formData.keys());
    console.log('📋 Form data keys:', formDataKeys);

    // Log all form data entries (excluding file content)
    console.log('📦 Form data entries:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  - ${key}: [File] ${value.name} (${value.type}, ${value.size} bytes)`);
      } else {
        console.log(`  - ${key}: ${String(value).substring(0, 100)}${String(value).length > 100 ? '...' : ''}`);
      }
    }

    const message = formData.get('message') as string;
    const file = formData.get('file') as File | null;
    // Support multiple files via files[] field
    const extraFilesList = formData.getAll('files[]') as File[];
    // Source: "chat" (default) atau "action_note" (dari catatan aksi)
    const source = (formData.get('source') as string) || 'chat';

    if ((!message || message.trim().length === 0) && !file && extraFilesList.length === 0) {
      console.error('❌ [STEP 4/8] No message or file provided');
      return NextResponse.json(
        { error: 'Message or file is required' },
        { status: 400 }
      );
    }

    console.log('✅ [STEP 4/8] Form data parsed successfully', {
      hasMessage: !!message?.trim(),
      hasFile: !!file,
      extraFilesCount: extraFilesList.length,
    });

    // Helper: upload a single File and return metadata
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

    // Step 5: Handle file uploads
    if (file) {
      try {
        const uploaded = await uploadFile(file, 0);
        fileUrl = uploaded.fileUrl;
        fileName = uploaded.fileName;
        fileType = uploaded.fileType;
        fileSize = uploaded.fileSize;
        console.log('✅ [STEP 5/8] Primary file uploaded:', fileUrl);
      } catch (err) {
        console.error('❌ [STEP 5/8] Primary file upload failed:', err);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
      }
    }

    // Upload extra files (files[] field)
    type ExtraFile = { fileUrl: string; fileName: string; fileType: string; fileSize: number };
    const extraFilesData: ExtraFile[] = [];
    for (let i = 0; i < extraFilesList.length; i++) {
      const ef = extraFilesList[i];
      try {
        const uploaded = await uploadFile(ef, i + 1);
        if (i === 0 && !fileUrl) {
          // Jadikan file pertama sebagai primary jika belum ada
          fileUrl  = uploaded.fileUrl;
          fileName = uploaded.fileName;
          fileType = uploaded.fileType;
          fileSize = uploaded.fileSize;
        } else {
          extraFilesData.push(uploaded);
        }
      } catch (err) {
        console.error(`❌ [STEP 5/8] Extra file ${i} upload failed:`, err);
      }
    }
    console.log(`✅ [STEP 5/8] Extra files uploaded: ${extraFilesData.length}`);

    // Step 6: Create new chat message in database
    console.log('📍 [STEP 6/8] Creating chat message in database...');
    console.log('💾 Chat data:', {
      tasklistId,
      senderId: session.id,
      messageLength: message?.trim().length || 0,
      hasFile: !!fileUrl
    });

    const chat = await prisma.tasklistChat.create({
      data: {
        tasklistId,
        senderId: session.id,
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
            role: true
          }
        }
      }
    });

    console.log('✅ [STEP 6/8] Chat message created successfully');
    console.log('  - Chat ID:', chat.id);
    console.log('  - Created at:', chat.createdAt);
    console.log('  - Sender:', chat.sender.namaLengkap);

    // Step 7: Broadcast real-time message via Pusher
    console.log('📍 [STEP 7/8] Broadcasting via Pusher...');
    try {
      console.log('🔌 Getting Pusher instance...');
      const pusher = getPusherServer();
      console.log('✅ Pusher instance obtained');

      // 1. Broadcast to task channel (for chat panel)
      console.log('📢 Broadcasting to task channel: private-task-' + tasklistId);
      await pusher.trigger(`private-task-${tasklistId}`, 'new-message', {
        message: chat
      });
      console.log('✅ Message broadcasted to task channel');

      // 2. Broadcast notification to task creator and assignee (not all team members)
      console.log('👥 Determining chat notification recipients...');
      
      const recipientIds = new Set<number>();
      
      // Add task creator (PM/SUPER_ADMIN who created the task)
      if (tasklist.createdBy && tasklist.createdBy !== session.id) {
        recipientIds.add(tasklist.createdBy);
        console.log('  ✅ Adding task creator:', tasklist.createdBy);
      }
      
      // Add task assignee (programmer)
      if (tasklist.pegawaiId && tasklist.pegawaiId !== session.id) {
        recipientIds.add(tasklist.pegawaiId);
        console.log('  ✅ Adding task assignee:', tasklist.pegawaiId);
      }
      
      console.log('📬 Recipients (excluding sender):', Array.from(recipientIds));

      if (recipientIds.size > 0) {
        // Broadcast to each user's channel
        console.log('📡 Broadcasting notifications to', recipientIds.size, 'recipients...');
        const broadcasts = Array.from(recipientIds).map(userId => {
          console.log('  - Sending to user', userId, 'on channel: private-user-' + userId);
          return pusher.trigger(`private-user-${userId}`, 'chat-notification', {
            taskId: tasklistId,
            taskCode: tasklist.kode,
            senderId: session.id,
            senderName: session.namaLengkap,
            message: message?.trim() || '[File]',
            hasFile: !!fileUrl
          });
        });

        await Promise.all(broadcasts);
        console.log('✅ Chat notifications sent to', recipientIds.size, 'recipients');
      } else {
        console.log('⚠️  No recipients to notify (sender is creator and assignee)');
      }
    } catch (pusherError) {
      // Log error but don't fail the request
      console.error('❌ [STEP 7/8] Pusher broadcast failed:');
      console.error('  - Error type:', pusherError instanceof Error ? pusherError.constructor.name : typeof pusherError);
      console.error('  - Error message:', pusherError instanceof Error ? pusherError.message : String(pusherError));
      if (pusherError instanceof Error && pusherError.stack) {
        console.error('  - Stack trace:', pusherError.stack);
      }
    }
    console.log('✅ [STEP 7/8] Pusher broadcast completed');

    // Step 8: Success
    const duration = Date.now() - startTime;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 [STEP 8/8] Chat send completed successfully!');
    console.log('⏱️  Total duration:', duration, 'ms');
    console.log('📊 Summary:', {
      chatId: chat.id,
      taskId: tasklistId,
      sender: session.namaLengkap,
      hasFile: !!fileUrl,
      messageLength: message?.trim().length || 0
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌❌❌ [CHAT POST] CRITICAL ERROR ❌❌❌');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🕐 Timestamp:', new Date().toISOString());
    console.error('⏱️  Duration before error:', duration, 'ms');
    console.error('📍 Endpoint: POST /api/tasklist/[id]/chat');
    console.error('🔍 Error Type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('💬 Error Message:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('📚 Stack Trace:');
      console.error(error.stack);
    }

    // Log additional error properties
    if (error && typeof error === 'object') {
      console.error('🔧 Error Object Keys:', Object.keys(error));
      try {
        console.error('🔧 Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (jsonError) {
        console.error('⚠️  Could not stringify error object:', jsonError);
      }
    }

    // Log request context if available
    try {
      console.error('📋 Request Context:');
      console.error('  - URL:', req.url);
      console.error('  - Method:', req.method);
      console.error('  - Headers:');
      const headers = Object.fromEntries(req.headers.entries());
      // Redact sensitive headers
      if (headers.cookie) headers.cookie = '[REDACTED]';
      if (headers.authorization) headers.authorization = '[REDACTED]';
      console.error('   ', JSON.stringify(headers, null, 2));
    } catch (contextError) {
      console.error('⚠️  Could not log request context:', contextError);
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json(
      {
        error: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
