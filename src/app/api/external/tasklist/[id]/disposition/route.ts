import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, cleanPhoneNumber } from '@/lib/whatsappService';

/**
 * External API endpoint for tasklist disposition (reassign)
 *
 * POST /api/external/tasklist/[id]/disposition - Reassign task to another programmer
 *
 * Authentication: X-API-Key header (EXTERNAL_API_KEY)
 *
 * Request Body (JSON):
 * {
 *   "newAssigneeId": 123,    // Required: ID of the new assignee (pegawai ID)
 *   "reason": "string",      // Required: reason for disposition
 *   "disposedBy": 456        // Required: ID of the user performing the disposition
 * }
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

// POST /api/external/tasklist/[id]/disposition
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json();
    const { newAssigneeId, reason, disposedBy } = body;

    if (!newAssigneeId || !reason || !disposedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: newAssigneeId, reason, disposedBy' },
        { status: 400 }
      );
    }

    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      include: {
        module: { select: { projectId: true } },
      },
    });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const oldAssignee = task.pegawaiId
      ? await prisma.pegawai.findUnique({ where: { id: task.pegawaiId }, select: { namaLengkap: true } })
      : null;

    const newAssignee = await prisma.pegawai.findUnique({
      where: { id: newAssigneeId },
      select: { namaLengkap: true },
    });
    if (!newAssignee) {
      return NextResponse.json({ success: false, error: 'New assignee not found' }, { status: 404 });
    }

    // Clone task for new assignee
    const newTask = await prisma.tasklist.create({
      data: {
        projectId: task.projectId,
        moduleId: task.moduleId,
        pegawaiId: newAssigneeId,
        createdBy: disposedBy,
        scheduleAt: task.scheduleAt,
        status: 'MENUNGGU_PROSES_USER',
        keterangan: `[DISPOSISI] ${reason}\n\nTask asli: ${task.kode}\n\n${task.keterangan || ''}`,
        programmerDescription: task.programmerDescription,
        imagePath: task.imagePath,
        kode: task.kode,
        statusCode: 1,
        idCrm: task.idCrm,
        ticketId: task.ticketId,
        ticketUrl: task.ticketUrl,
        tasklistType: task.tasklistType,
        assigneeStartTaskDeadline: task.assigneeStartTaskDeadline,
        assigneeWorkDeadline: task.assigneeWorkDeadline,
        pmReviewDeadline: task.pmReviewDeadline,
        calculatedDueDate: task.calculatedDueDate,
        taskComplexity: task.taskComplexity,
        customDurationHours: task.customDurationHours,
      },
    });

    // Log activity for both tasks
    await prisma.taskActivity.create({
      data: {
        taskId: taskId,
        userId: disposedBy,
        action: 'DISPOSITION',
        note: `Task didisposisi ke ${newAssignee.namaLengkap}. Alasan: ${reason}`,
        metadata: { childTaskId: newTask.id, newAssigneeId, reason },
      },
    });

    await prisma.taskActivity.create({
      data: {
        taskId: newTask.id,
        userId: disposedBy,
        action: 'CREATED_BY_DISPOSITION',
        note: `Task dibuat dari disposisi task #${taskId} (${task.kode}). Alasan: ${reason}`,
        metadata: { originalTaskId: taskId, originalAssigneeId: task.pegawaiId, reason },
      },
    });

    await prisma.tasklistLog.create({
      data: {
        taskId: taskId,
        userId: disposedBy,
        action: 'DISPOSITION',
        keterangan: `Disposisi ke ${newAssignee.namaLengkap}. Alasan: ${reason}`,
        waktu: new Date(),
      },
    });

    await prisma.tasklistLog.create({
      data: {
        taskId: newTask.id,
        userId: disposedBy,
        action: 'CREATED',
        keterangan: `Task dibuat dari disposisi oleh ${oldAssignee?.namaLengkap || 'PM'}. Alasan: ${reason}`,
        waktu: new Date(),
      },
    });

    // Notification for new assignee
    await prisma.notification.create({
      data: {
        userId: newAssigneeId,
        type: 'TASK_DISPOSITION',
        title: 'Task Baru dari Disposisi',
        message: `Task ${task.kode} telah didisposisi ke Anda. Alasan: ${reason}`,
        taskId: newTask.id,
        taskCode: task.kode,
        projectId: task.module.projectId,
        fromUserId: disposedBy,
        priority: 'high',
        data: { reason, originalTaskId: taskId },
      },
    });

    // WhatsApp notification (non-blocking)
    try {
      const newAssigneeWithPhone = await prisma.pegawai.findUnique({
        where: { id: newAssigneeId },
        select: { namaLengkap: true, noHp: true },
      });

      if (newAssigneeWithPhone?.noHp) {
        const cleanPhone = cleanPhoneNumber(newAssigneeWithPhone.noHp);
        if (cleanPhone) {
          const project = await prisma.proyek.findUnique({
            where: { id: task.projectId },
            select: { namaProyek: true },
          });
          const module = await prisma.proyekModule.findUnique({
            where: { id: task.moduleId },
            select: { nama: true },
          });

          const message = `${newAssigneeWithPhone.namaLengkap},

📋 *TASK DISPOSISI*

Anda mendapat task baru dari disposisi:

🏢 *Proyek:* ${project?.namaProyek || 'N/A'}
📁 *Modul:* ${module?.nama || 'N/A'}
🔢 *Kode Task:* ${task.kode}
📝 *Alasan Disposisi:* ${reason}${task.keterangan ? `\n\n*Keterangan Task:*\n${task.keterangan}` : ''}

Mohon segera cek dan kerjakan task ini.

_(Pesan otomatis dari Richz-Log)_`;

          sendWhatsAppMessage({
            to: cleanPhone,
            message,
            taskId: newTask.id,
            notificationType: 'task_assigned',
          }).catch((err) => console.error('[Disposition WA] Error:', err));
        }
      }
    } catch (waError) {
      console.error('[Disposition WA] Failed (non-fatal):', waError);
    }

    return NextResponse.json({
      success: true,
      message: 'Task disposed successfully (new task created)',
      data: {
        parentTask: { id: task.id, kode: task.kode },
        newTask: { id: newTask.id, kode: newTask.kode, status: newTask.status },
        oldAssignee: oldAssignee?.namaLengkap || null,
        newAssignee: newAssignee.namaLengkap,
      },
    });
  } catch (error) {
    console.error('Error disposing task via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to dispose task', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
