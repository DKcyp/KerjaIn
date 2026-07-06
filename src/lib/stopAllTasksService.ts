/**
 * Stop All Active Tasks Service
 * Automatically stops all running tasks and sends notifications
 */

import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, cleanPhoneNumber } from './whatsappService';

interface StoppedTask {
  id: number;
  kode: string;
  pegawaiId: number;
  pegawaiNama: string;
  pegawaiNoHp: string | null;
  proyekNama: string;
  modulNama: string;
  startedAt: Date;
  sessionDurationMinutes: number;
  totalDurationMinutes: number;
}

interface StopAllTasksResult {
  success: boolean;
  stoppedCount: number;
  stoppedTasks: StoppedTask[];
  notificationsSent: number;
  notificationsFailed: number;
  errors: string[];
  timestamp: Date;
}

/**
 * Stop all active tasks and send WhatsApp notifications
 */
export async function stopAllActiveTasks(
  reason?: string,
  sendAdminNotification: boolean = true
): Promise<StopAllTasksResult> {
  const timestamp = new Date();
  const errors: string[] = [];
  const stoppedTasks: StoppedTask[] = [];
  let notificationsSent = 0;
  let notificationsFailed = 0;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[StopAllTasks] 🛑 Starting auto-stop process');
  console.log('[StopAllTasks] Timestamp:', timestamp.toISOString());
  console.log('[StopAllTasks] Reason:', reason || 'Auto-stop (end of work hours)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. Find all active tasks
    const activeTasks = await prisma.tasklist.findMany({
      where: {
        status: 'SEDANG_DIPROSES_USER',
        isPaused: false,
        startedAt: { not: null }
      },
      include: {
        module: {
          select: {
            nama: true,
            kode: true
          }
        }
      }
    });

    console.log(`[StopAllTasks] Found ${activeTasks.length} active tasks`);

    if (activeTasks.length === 0) {
      console.log('[StopAllTasks] ✅ No active tasks to stop');
      return {
        success: true,
        stoppedCount: 0,
        stoppedTasks: [],
        notificationsSent: 0,
        notificationsFailed: 0,
        errors: [],
        timestamp
      };
    }

    // 2. Get pegawai data for all tasks
    const pegawaiIds = [...new Set(activeTasks.map(t => t.pegawaiId))];
    const pegawaiData = await prisma.pegawai.findMany({
      where: { id: { in: pegawaiIds } },
      select: {
        id: true,
        namaLengkap: true,
        noHp: true
      }
    });

    const pegawaiMap = new Map(pegawaiData.map(p => [p.id, p]));

    // 3. Get project data
    const projectIds = [...new Set(activeTasks.map(t => t.projectId))];
    const projectData = await prisma.proyek.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        namaProyek: true
      }
    });

    const projectMap = new Map(projectData.map(p => [p.id, p]));

    // 4. Stop each task
    for (const task of activeTasks) {
      try {
        const now = new Date();
        let sessionDurationMinutes = 0;

        // Calculate session duration
        if (task.startedAt) {
          const sessionDuration = now.getTime() - task.startedAt.getTime();
          sessionDurationMinutes = Math.floor(sessionDuration / (1000 * 60));
        }

        const finalDuration = task.totalDurationMinutes + sessionDurationMinutes;

        // Update task to paused status
        await prisma.tasklist.update({
          where: { id: task.id },
          data: {
            status: 'SEDANG_DIPROSES_USER_PAUSED',
            pausedAt: now,
            totalDurationMinutes: finalDuration,
            isPaused: true
          }
        });

        // Log the action
        await prisma.tasklistLog.create({
          data: {
            taskId: task.id,
            waktu: now,
            userId: task.pegawaiId,
            keterangan: reason || 'Auto-stop: End of work hours',
            action: 'AUTO_STOP',
            totalStartStopMinutes: sessionDurationMinutes
          }
        });

        // Collect task data for notification
        const pegawai = pegawaiMap.get(task.pegawaiId);
        const project = projectMap.get(task.projectId);

        if (pegawai && project) {
          stoppedTasks.push({
            id: task.id,
            kode: task.kode,
            pegawaiId: task.pegawaiId,
            pegawaiNama: pegawai.namaLengkap,
            pegawaiNoHp: pegawai.noHp,
            proyekNama: project.namaProyek,
            modulNama: task.module.nama,
            startedAt: task.startedAt!,
            sessionDurationMinutes,
            totalDurationMinutes: finalDuration
          });
        }

        console.log(`[StopAllTasks] ✅ Stopped task ${task.kode} (${sessionDurationMinutes} min)`);
      } catch (taskError) {
        const errorMsg = `Failed to stop task ${task.kode}: ${taskError instanceof Error ? taskError.message : 'Unknown error'}`;
        console.error(`[StopAllTasks] ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // 5. Send WhatsApp notifications to programmers
    console.log('[StopAllTasks] 📱 Sending WhatsApp notifications...');

    // Group tasks by programmer
    const tasksByProgrammer = new Map<number, StoppedTask[]>();
    for (const task of stoppedTasks) {
      const existing = tasksByProgrammer.get(task.pegawaiId) || [];
      existing.push(task);
      tasksByProgrammer.set(task.pegawaiId, existing);
    }

    // Send notification to each programmer
    for (const [pegawaiId, tasks] of tasksByProgrammer) {
      const programmer = tasks[0]; // Get programmer info from first task
      
      if (!programmer.pegawaiNoHp) {
        console.warn(`[StopAllTasks] ⚠️ No phone number for ${programmer.pegawaiNama}`);
        notificationsFailed++;
        continue;
      }

      const cleanPhone = cleanPhoneNumber(programmer.pegawaiNoHp);
      if (!cleanPhone) {
        console.warn(`[StopAllTasks] ⚠️ Invalid phone number for ${programmer.pegawaiNama}`);
        notificationsFailed++;
        continue;
      }

      // Format message
      const message = formatProgrammerStopMessage(programmer.pegawaiNama, tasks, reason);

      // Send WhatsApp (non-blocking)
      sendWhatsAppMessage({
        to: cleanPhone,
        message,
        notificationType: 'daily_summary'
      })
        .then(result => {
          if (result.success) {
            notificationsSent++;
            console.log(`[StopAllTasks] ✅ WA sent to ${programmer.pegawaiNama}`);
          } else {
            notificationsFailed++;
            console.error(`[StopAllTasks] ❌ WA failed for ${programmer.pegawaiNama}: ${result.error}`);
          }
        })
        .catch(error => {
          notificationsFailed++;
          console.error(`[StopAllTasks] ❌ WA error for ${programmer.pegawaiNama}:`, error);
        });
    }

    // 6. Send summary to admin
    if (sendAdminNotification && stoppedTasks.length > 0) {
      await sendAdminSummary(stoppedTasks, reason);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[StopAllTasks] ✅ Process completed');
    console.log('[StopAllTasks] Stopped:', stoppedTasks.length, 'tasks');
    console.log('[StopAllTasks] Notifications sent:', notificationsSent);
    console.log('[StopAllTasks] Notifications failed:', notificationsFailed);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      stoppedCount: stoppedTasks.length,
      stoppedTasks,
      notificationsSent,
      notificationsFailed,
      errors,
      timestamp
    };
  } catch (error) {
    console.error('[StopAllTasks] ❌ Fatal error:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    return {
      success: false,
      stoppedCount: stoppedTasks.length,
      stoppedTasks,
      notificationsSent,
      notificationsFailed,
      errors,
      timestamp
    };
  }
}

/**
 * Format WhatsApp message for programmer
 */
function formatProgrammerStopMessage(
  programmerName: string,
  tasks: StoppedTask[],
  reason?: string
): string {
  const currentHour = new Date().getHours();
  let greeting = 'Selamat pagi';
  if (currentHour >= 12 && currentHour < 15) {
    greeting = 'Selamat siang';
  } else if (currentHour >= 15 && currentHour < 18) {
    greeting = 'Selamat sore';
  } else if (currentHour >= 18 || currentHour < 6) {
    greeting = 'Selamat malam';
  }

  const taskCount = tasks.length;
  const totalMinutes = tasks.reduce((sum, t) => sum + t.sessionDurationMinutes, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const durationText = hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`;

  let message = `${greeting} ${programmerName},

🛑 *TASK OTOMATIS DIHENTIKAN*

${reason || 'Jam kerja telah berakhir. Semua task yang sedang berjalan telah dihentikan otomatis.'}

📊 *Ringkasan Hari Ini:*
• Total task dihentikan: ${taskCount}
• Total waktu kerja: ${durationText}

📋 *Detail Task:*\n`;

  tasks.forEach((task, index) => {
    const taskHours = Math.floor(task.sessionDurationMinutes / 60);
    const taskMinutes = task.sessionDurationMinutes % 60;
    const taskDuration = taskHours > 0 ? `${taskHours}j ${taskMinutes}m` : `${taskMinutes}m`;
    
    message += `${index + 1}. ${task.kode} - ${task.modulNama}
   ⏱️ Durasi: ${taskDuration}
   📁 Proyek: ${task.proyekNama}\n\n`;
  });

  message += `Progress Anda telah tersimpan dan dapat dilanjutkan besok.

Terima kasih atas kerja keras Anda hari ini! 🙏

_(Pesan otomatis dari Richz-Log)_`;

  return message;
}

/**
 * Send summary notification to admin
 */
async function sendAdminSummary(tasks: StoppedTask[], reason?: string): Promise<void> {
  try {
    // Get all SUPER_ADMIN users
    const allAdmins = await prisma.pegawai.findMany({
      where: {
        role: 'SUPER_ADMIN'
      },
      select: {
        id: true,
        namaLengkap: true,
        noHp: true
      }
    });

    // Filter admins with valid phone numbers
    const admins = allAdmins.filter(admin => admin.noHp && admin.noHp.trim() !== '');

    if (admins.length === 0) {
      console.warn('[StopAllTasks] ⚠️ No admin with phone number found');
      return;
    }

    // Calculate statistics
    const uniqueProgrammers = new Set(tasks.map(t => t.pegawaiId)).size;
    const totalMinutes = tasks.reduce((sum, t) => sum + t.sessionDurationMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const message = `📊 *LAPORAN AUTO-STOP TASK*

${reason || 'Jam kerja telah berakhir'}

*Ringkasan:*
• Task dihentikan: ${tasks.length}
• Programmer: ${uniqueProgrammers} orang
• Total durasi: ${hours} jam ${minutes} menit

*Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

Semua task telah dihentikan dan progress tersimpan.

_(Pesan otomatis dari Richz-Log)_`;

    // Send to all admins
    for (const admin of admins) {
      if (!admin.noHp || admin.noHp.trim() === '') continue;

      const cleanPhone = cleanPhoneNumber(admin.noHp);
      if (!cleanPhone) continue;

      sendWhatsAppMessage({
        to: cleanPhone,
        message,
        notificationType: 'daily_summary'
      })
        .then(result => {
          if (result.success) {
            console.log(`[StopAllTasks] ✅ Admin summary sent to ${admin.namaLengkap}`);
          }
        })
        .catch(error => {
          console.error(`[StopAllTasks] ❌ Admin summary failed for ${admin.namaLengkap}:`, error);
        });
    }
  } catch (error) {
    console.error('[StopAllTasks] ❌ Failed to send admin summary:', error);
  }
}

/**
 * Get statistics of stopped tasks
 */
export async function getStopAllTasksStats(): Promise<{
  lastRun: Date | null;
  totalStoppedToday: number;
  totalStoppedThisWeek: number;
  totalStoppedThisMonth: number;
}> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [lastRun, todayCount, weekCount, monthCount] = await Promise.all([
      prisma.tasklistLog.findFirst({
        where: { action: 'AUTO_STOP' },
        orderBy: { waktu: 'desc' },
        select: { waktu: true }
      }),
      prisma.tasklistLog.count({
        where: {
          action: 'AUTO_STOP',
          waktu: { gte: todayStart }
        }
      }),
      prisma.tasklistLog.count({
        where: {
          action: 'AUTO_STOP',
          waktu: { gte: weekStart }
        }
      }),
      prisma.tasklistLog.count({
        where: {
          action: 'AUTO_STOP',
          waktu: { gte: monthStart }
        }
      })
    ]);

    return {
      lastRun: lastRun?.waktu || null,
      totalStoppedToday: todayCount,
      totalStoppedThisWeek: weekCount,
      totalStoppedThisMonth: monthCount
    };
  } catch (error) {
    console.error('[StopAllTasks] Error getting stats:', error);
    return {
      lastRun: null,
      totalStoppedToday: 0,
      totalStoppedThisWeek: 0,
      totalStoppedThisMonth: 0
    };
  }
}
