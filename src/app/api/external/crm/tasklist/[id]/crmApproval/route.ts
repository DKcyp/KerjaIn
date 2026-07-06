import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTaskNotification, notificationTemplates, notifyCreatorAndPM } from '@/lib/notificationHelper';

// Ensure log table exists (runtime-safe)
async function ensureLogTable() {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS public.tasklist_log (
        id SERIAL PRIMARY KEY,
        "taskId" INT NOT NULL,
        waktu TIMESTAMP NOT NULL DEFAULT NOW(),
        "userId" INT NOT NULL,
        keterangan TEXT NULL,
        status TEXT NULL,
        action TEXT NOT NULL
      );`
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_task_waktu ON public.tasklist_log ("taskId", waktu DESC);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_user ON public.tasklist_log ("userId");`);
  } catch (e) {
    console.error('ensureLogTable failed (non-fatal)', e);
  }
}

// PUT /api/external/crm/tasklist/[id]/crmApproval
// Note: The path parameter [id] here is treated as idCrm (CRM ticket ID)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const idCrm = String(id || '').trim();
    if (!idCrm) {
      return NextResponse.json({ error: 'Invalid idCrm' }, { status: 400 });
    }

    // Parse and validate body JSON (all fields required)
    let note: string;
    let username: string; // from CRM, not used as approver; only for log text
    let action: 'approve' | 'close';
    try {
      const body = await request.json();
      const rawNote = body?.keterangan;
      const rawUser = body?.username;
      const rawAction = body?.action;

      if (typeof rawNote !== 'string' || !rawNote.trim()) {
        return NextResponse.json({ error: 'Invalid body', message: 'Field keterangan wajib diisi' }, { status: 400 });
      }
      if (typeof rawUser !== 'string' || !rawUser.trim()) {
        return NextResponse.json({ error: 'Invalid body', message: 'Field username wajib diisi' }, { status: 400 });
      }
      if (typeof rawAction !== 'string') {
        return NextResponse.json({ error: 'Invalid body', message: "Field action wajib diisi ('approve' atau 'close')" }, { status: 400 });
      }
      const a = String(rawAction).toLowerCase();
      if (a !== 'approve' && a !== 'close') {
        return NextResponse.json({ error: 'Invalid body', message: "Field action harus bernilai 'approve' atau 'close'" }, { status: 400 });
      }

      note = rawNote.trim();
      username = rawUser.trim();
      action = a as 'approve' | 'close';
    } catch {
      return NextResponse.json({ error: 'Invalid JSON', message: 'Body request harus berupa JSON valid' }, { status: 400 });
    }

    // Fetch task by id_crm (raw SQL because prisma model may not expose id_crm)
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.tasklist WHERE id_crm = $1 LIMIT 1`,
      idCrm
    );
    const task = rows && rows[0];
    if (!task) {
      return NextResponse.json({ error: 'Task not found for given idCrm' }, { status: 404 });
    }
    const taskId: number = Number(task.id);

    // Proceed approval regardless of current status (per request: remove validation)

    // Resolve approver as the PM of the task's project (not the CRM username)
    let approverId = 0;
    let approverName = 'System (CRM)';
    try {
      const projectId: number = Number(task.projectId ?? (task as any).projectid);
      const pmTeam = await prisma.proyekTeam.findFirst({
        where: { projectId, jabatan: { contains: 'pm', mode: 'insensitive' } },
        orderBy: { id: 'asc' }
      });
      if (pmTeam) {
        const pm = await prisma.pegawai.findUnique({ where: { id: pmTeam.pegawaiId }, select: { id: true, namaLengkap: true, username: true } });
        if (pm) {
          approverId = pm.id;
          approverName = pm.namaLengkap || pm.username || 'PM';
        }
      }
    } catch (e) {
      console.error('Failed to resolve PM approver:', e);
    }

    // Update status to SELESAI
    const updated = await prisma.tasklist.update({ where: { id: taskId }, data: { status: 'SELESAI' as any } });

    // Send notification to assignee
    try {
      const template = notificationTemplates['task.approved'](updated.kode, approverName);
      await sendTaskNotification({
        type: 'task.approved',
        taskId: taskId,
        taskCode: updated.kode,
        projectId: updated.projectId,
        fromUserId: approverId,
        fromUserName: approverName,
        toUserId: updated.pegawaiId,
        title: template.title,
        message: template.message,
        priority: template.priority,
      });
    } catch (notifError) {
      console.error('Failed to send approval notification:', notifError);
    }

    // Notify creator and PM (same effect as internal approve)
    try {
      const template = notificationTemplates['task.approved'](updated.kode, approverName);
      await notifyCreatorAndPM({
        taskId: taskId,
        eventType: 'task.approved',
        template,
        fromUserId: approverId,
        fromUserName: approverName,
      });
    } catch (e) {
      console.error('Failed to notify creator/PM:', e);
    }

    // Log status change
    try {
      await ensureLogTable();
      const verb = action === 'close' ? 'Closed' : 'Approved';
      const baseMsg = `Task ${verb.toLowerCase()} via external CRM endpoint oleh ${approverName}`;
      const extraFromCRM = username ? `\n${verb} by (CRM): ${username}` : '';
      const statusMsg = `${baseMsg}${extraFromCRM}${note ? `\n\nKeterangan dari CRM:\n${note}` : ''}`;
      const nowTs = new Date();
      await prisma.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action)
        VALUES (${taskId}, (${nowTs}::timestamptz AT TIME ZONE 'Asia/Jakarta')::timestamp, ${approverId}, ${statusMsg}, ${'SELESAI'}::text::"TaskStatus", ${'STATUS_CHANGE'})`;
    } catch (e) {
      console.error('TasklistLog insert (external approve) failed', e);
    }

    const message = action === 'close' ? 'Tasklist berhasil di closed' : 'Tasklist berhasil di approve';
    return NextResponse.json({ success: true, status: updated.status, message });
  } catch (error) {
    console.error('External CRM approval error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
