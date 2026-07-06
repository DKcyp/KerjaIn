import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendWhatsAppMessage, cleanPhoneNumber } from '@/lib/whatsappService';

const prisma = new PrismaClient();

// POST /api/tasklist/[id]/disposition
// Disposisi task ke programmer lain (khusus PM)
// NOTE: Disposition adalah action administratif, PM/SUPER_ADMIN bisa melakukan kapan saja tanpa validasi jam kerja
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);
    const body = await request.json();
    const { newAssigneeId, reason, disposedBy } = body;

    if (isNaN(taskId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task ID' },
        { status: 400 }
      );
    }

    if (!newAssigneeId || !reason || !disposedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get task
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      include: {
        module: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get old and new assignee info
    const oldAssignee = await prisma.pegawai.findUnique({
      where: { id: task.pegawaiId },
      select: { namaLengkap: true },
    });

    const newAssignee = await prisma.pegawai.findUnique({
      where: { id: newAssigneeId },
      select: { namaLengkap: true },
    });

    if (!newAssignee) {
      return NextResponse.json(
        { success: false, error: 'New assignee not found' },
        { status: 404 }
      );
    }

    // Clone task - create new tasklist for the new assignee
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
        kode: task.kode, // Same task code to show relation
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

    // Create activity log for parent task
    await prisma.taskActivity.create({
      data: {
        taskId: taskId,
        userId: disposedBy,
        action: 'DISPOSITION',
        note: `Task didisposisi ke ${newAssignee.namaLengkap}. Alasan: ${reason}`,
        metadata: {
          childTaskId: newTask.id,
          newAssigneeId: newAssigneeId,
          reason: reason,
        },
      },
    });

    // Create activity log for new task
    await prisma.taskActivity.create({
      data: {
        taskId: newTask.id,
        userId: disposedBy,
        action: 'CREATED_BY_DISPOSITION',
        note: `Task dibuat dari disposisi task #${taskId} (${task.kode}). Alasan: ${reason}`,
        metadata: {
          originalTaskId: taskId,
          originalAssigneeId: task.pegawaiId,
          reason: reason,
        },
      },
    });

    // Create tasklist log for parent task
    await prisma.tasklistLog.create({
      data: {
        taskId: taskId,
        userId: disposedBy,
        action: 'DISPOSITION',
        keterangan: `Disposisi ke ${newAssignee.namaLengkap}. Alasan: ${reason}`,
        waktu: new Date(),
      },
    });

    // Create tasklist log for new task
    await prisma.tasklistLog.create({
      data: {
        taskId: newTask.id,
        userId: disposedBy,
        action: 'CREATED',
        keterangan: `Task dibuat dari disposisi oleh ${oldAssignee?.namaLengkap || 'PM'}. Alasan: ${reason}`,
        waktu: new Date(),
      },
    });

    // Create notification for new assignee
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
        data: {
          reason: reason,
          originalTaskId: taskId,
        },
      },
    });

    // Send WhatsApp notification to new assignee
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📱 [Disposition WA] Sending WhatsApp notification for task disposition');
      console.log('📋 [Disposition WA] Task:', task.kode);
      console.log('👤 [Disposition WA] New Assignee ID:', newAssigneeId);

      // Get new assignee with phone number
      const newAssigneeWithPhone = await prisma.pegawai.findUnique({
        where: { id: newAssigneeId },
        select: { namaLengkap: true, noHp: true },
      });

      console.log('👤 [Disposition WA] New Assignee Data:', {
        name: newAssigneeWithPhone?.namaLengkap,
        hasPhone: !!newAssigneeWithPhone?.noHp,
        phone: newAssigneeWithPhone?.noHp ? `${newAssigneeWithPhone.noHp.substring(0, 4)}****` : 'NO PHONE'
      });

      if (newAssigneeWithPhone?.noHp) {
        const cleanPhone = cleanPhoneNumber(newAssigneeWithPhone.noHp);
        console.log('📞 [Disposition WA] Phone number validation:', {
          original: newAssigneeWithPhone.noHp,
          cleaned: cleanPhone,
          isValid: !!cleanPhone
        });

        if (cleanPhone) {
          // Get project info
          const project = await prisma.proyek.findUnique({
            where: { id: task.projectId },
            select: { namaProyek: true },
          });

          // Get module info
          const module = await prisma.proyekModule.findUnique({
            where: { id: task.moduleId },
            select: { nama: true },
          });

          console.log('📋 [Disposition WA] Task details:', {
            project: project?.namaProyek,
            module: module?.nama,
            taskCode: task.kode
          });

          const message = `${newAssigneeWithPhone.namaLengkap},

📋 *TASK DISPOSISI*

Anda mendapat task baru dari disposisi:

🏢 *Proyek:* ${project?.namaProyek || 'N/A'}
📁 *Modul:* ${module?.nama || 'N/A'}
🔢 *Kode Task:* ${task.kode}
📝 *Alasan Disposisi:* ${reason}${task.keterangan ? `

*Keterangan Task:*
${task.keterangan}` : ''}

Mohon segera cek dan kerjakan task ini.

_(Pesan otomatis dari Richz-Log)_`;

          console.log('📤 [Disposition WA] Calling sendWhatsAppMessage...');
          console.log('📤 [Disposition WA] Message length:', message.length);
          console.log('📤 [Disposition WA] To:', cleanPhone);
          console.log('📤 [Disposition WA] TaskId:', newTask.id);
          console.log('📤 [Disposition WA] Type:', 'task_assigned');

          // Send notification (non-blocking like time-tracking)
          sendWhatsAppMessage({
            to: cleanPhone,
            message,
            taskId: newTask.id,
            notificationType: 'task_assigned',
          }).then(result => {
            if (result.success) {
              console.log('✅ [Disposition WA] WhatsApp notification sent successfully to:', newAssigneeWithPhone.namaLengkap);
              console.log('✅ [Disposition WA] Message ID:', result.messageId);
            } else {
              console.error('❌ [Disposition WA] WhatsApp notification failed:', result.error);
            }
          }).catch(error => {
            console.error('❌ [Disposition WA] WhatsApp notification error:', error);
          });

          console.log('✅ [Disposition WA] WhatsApp send initiated (non-blocking)');
        } else {
          console.log('⚠️ [Disposition WA] Invalid phone number format');
        }
      } else {
        console.log('⚠️ [Disposition WA] New assignee has no phone number');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (waError) {
      console.error('❌ [Disposition WA] Failed to send WhatsApp notification:', waError);
      console.error('❌ [Disposition WA] Error stack:', waError instanceof Error ? waError.stack : 'No stack');
      // Don't fail the whole operation if WhatsApp fails
    }

    return NextResponse.json({
      success: true,
      message: 'Task berhasil didisposisi (task baru dibuat)',
      data: {
        parentTask: task,
        newTask: newTask,
        oldAssignee: oldAssignee?.namaLengkap,
        newAssignee: newAssignee.namaLengkap,
      },
    });
  } catch (error) {
    console.error('[Task Disposition] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to dispose task' },
      { status: 500 }
    );
  }
}
