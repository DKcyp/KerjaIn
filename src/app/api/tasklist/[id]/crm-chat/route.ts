import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

export const runtime = 'nodejs';

const CRM_API_BASE = process.env.CRM_API_BASE || 'https://richz-crm-dev.expressa.id/hrd/api';
const CRM_API_KEY = process.env.CRM_API_KEY || '123456789';
const CRM_USER_ID = process.env.CRM_USER_ID || '1';

// GET /api/tasklist/[id]/crm-chat
// Returns CRM chat messages split into PM (sender_tipe !== 'c') and PIC (sender_tipe === 'c')
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Fetch the task to get ticketId or idCrm
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: { ticketId: true, idCrm: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const crmTicketId = task.idCrm;
    if (!crmTicketId) {
      return NextResponse.json({
        ticket: null,
        messages_pm: [],
        messages_pic: [],
        error: 'No CRM ticket linked to this task',
      });
    }

    // Fetch from CRM API for PIC messages (original endpoint)
    const crmUrlPic = `${CRM_API_BASE}/crm_chat/tasklist/${crmTicketId}/messages?user_id=${CRM_USER_ID}`;
    // Fetch from CRM API for PM messages (new endpoint: tasklist_chat)
    const crmUrlPm = `${CRM_API_BASE}/tasklist_chat/${crmTicketId}/messages?user_id=${CRM_USER_ID}&limit=100&offset=0`;

    console.log(`[CRM Chat] Fetching PIC: ${crmUrlPic}`);
    console.log(`[CRM Chat] Fetching PM: ${crmUrlPm}`);

    const [crmResPic, crmResPm] = await Promise.all([
      fetch(crmUrlPic, {
        method: 'GET',
        headers: {
          'X-API-KEY': CRM_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }),
      fetch(crmUrlPm, {
        method: 'GET',
        headers: {
          'X-API-KEY': CRM_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })
    ]);

    let messages_pic: any[] = [];
    let messages_pm: any[] = [];
    let crmTicket: any = null;
    let allMessages: any[] = [];

    if (crmResPic.ok) {
      const crmDataPic = await crmResPic.json();
      if (crmDataPic.status) {
        crmTicket = crmDataPic.ticket || crmTicket;
        const picMsgs = crmDataPic.messages || [];
        messages_pic = picMsgs.filter((m: any) => m.sender_tipe === 'c' || m.sender_tipe === 'i');
        allMessages = [...allMessages, ...picMsgs];
      }
    } else {
      console.error(`[CRM Chat] PIC API returned ${crmResPic.status}`);
    }

    if (crmResPm.ok) {
      const crmDataPm = await crmResPm.json();
      console.log(`[CRM Chat] PM API response keys:`, Object.keys(crmDataPm));
      if (crmDataPm.messages && crmDataPm.messages.length > 0) {
        console.log(`[CRM Chat] First message keys:`, Object.keys(crmDataPm.messages[0]));
        console.log(`[CRM Chat] First message attachments:`, JSON.stringify(crmDataPm.messages[0].attachments || 'none'));
        console.log(`[CRM Chat] First message file fields:`, JSON.stringify({
          file: crmDataPm.messages[0].file,
          file_url: crmDataPm.messages[0].file_url,
          file_name: crmDataPm.messages[0].file_name,
          file_type: crmDataPm.messages[0].file_type,
          path: crmDataPm.messages[0].path,
          url: crmDataPm.messages[0].url,
          filename: crmDataPm.messages[0].filename,
          mime_type: crmDataPm.messages[0].mime_type,
        }));
      }
      if (crmDataPm.status) {
        crmTicket = crmDataPm.ticket || crmTicket || crmDataPm.tasklist;
        const pmMsgs = crmDataPm.messages || [];
        // Map fields if needed, but the response schema shows: id, message, note, sender, username, sender_tipe, status, created_at, attachments.
        // Let's map "message" to "keterangan", "sender" to "sender_name" if the frontend expects the crm-chat schema.
        // In TaskDetailModal.tsx, we saw: msg.sender_name, msg.created_at, msg.keterangan, msg.attachments.
        // But the response from tasklist_chat has: message instead of keterangan, sender instead of sender_name.
        // Let's normalize/map the messages from tasklist_chat to match the frontend expectations!
        const mappedPmMsgs = pmMsgs.map((m: any) => {
          // Build attachments from various sources
          let attachments: { url: string; name: string; type: string }[] = [];

          // 1. From m.attachments array
          const rawAtts = m.attachments || [];
          if (rawAtts.length > 0) {
            attachments = rawAtts.map((att: any) => ({
              url: att.url || att.file_url || att.path || att.link || att.file_path || '',
              name: att.name || att.file_name || att.filename || att.file || '',
              type: att.type || att.mime_type || att.content_type || att.file_type || '',
            }));
          }

          // 2. Fallback: check file-related fields directly on message object
          if (attachments.length === 0) {
            const msgFileUrl = m.file_url || m.file_path || m.url || m.path || '';
            const msgFileName = m.file_name || m.filename || m.file || '';
            const msgFileType = m.file_type || m.mime_type || m.content_type || '';
            if (msgFileUrl) {
              attachments = [{ url: msgFileUrl, name: msgFileName, type: msgFileType }];
            }
          }

          return {
            id: m.id,
            id_komplain: m.id_komplain || crmTicketId,
            keterangan: m.message,
            sender_id: m.sender_id || '',
            sender_name: m.sender || '',
            sender_tipe: m.sender_tipe,
            status: m.status,
            created_at: m.created_at,
            attachments,
          };
        });
        messages_pm = mappedPmMsgs.filter((m: any) => m.sender_tipe !== 'c');
        allMessages = [...allMessages, ...pmMsgs];
      }
    } else {
      console.error(`[CRM Chat] PM API returned ${crmResPm.status}`);
    }

    return NextResponse.json({
      ticket: crmTicket,
      messages_pm,
      messages_pic,
      all: allMessages,
    });
  } catch (e: any) {
    console.error('[CRM Chat] Error:', e);
    return NextResponse.json({
      ticket: null,
      messages_pm: [],
      messages_pic: [],
      error: e.message || 'Server error',
    });
  }
}

// POST /api/tasklist/[id]/crm-chat
// Sends a message to the CRM API (supports file upload via multipart/form-data)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Parse form data (multipart/form-data for file uploads)
    const formData = await req.formData();
    const message = formData.get('message') as string | null;

    // Collect all files from the 'file' field
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'file' && value instanceof File) {
        files.push(value);
      }
    }

    if ((!message || !message.trim()) && files.length === 0) {
      return NextResponse.json({ error: 'Message or file is required' }, { status: 400 });
    }

    // Fetch the task to get ticketId or idCrm
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: { ticketId: true, idCrm: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const crmTicketId = task.ticketId || task.idCrm;
    if (!crmTicketId) {
      return NextResponse.json({ error: 'No CRM ticket linked to this task' }, { status: 400 });
    }

    // Build multipart/form-data body for CRM API
    const crmFormData = new FormData();
    if (message && message.trim()) {
      crmFormData.append('message', message.trim());
    }
    for (const file of files) {
      crmFormData.append('file', file, file.name);
    }

    // Dynamic user_id from config or fallback to 792 as requested
    const targetUserId = CRM_USER_ID !== '1' ? CRM_USER_ID : '792';
    const crmUrl = `${CRM_API_BASE}/tasklist_chat/${crmTicketId}/send?user_id=${targetUserId}`;
    console.log(`[CRM Chat] Sending PM to: ${crmUrl} (${files.length} file(s))`);

    const crmRes = await fetch(crmUrl, {
      method: 'POST',
      headers: {
        'X-API-KEY': CRM_API_KEY,
      },
      body: crmFormData,
    });

    if (!crmRes.ok) {
      const errorText = await crmRes.text();
      console.error(`[CRM Chat] Send API failed: ${crmRes.status}`, errorText);
      return NextResponse.json({ error: `CRM API error: ${crmRes.status}` }, { status: crmRes.status });
    }

    const crmData = await crmRes.json();
    return NextResponse.json(crmData);
  } catch (e: any) {
    console.error('[CRM Chat] Send Error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
