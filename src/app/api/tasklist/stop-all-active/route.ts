import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getActiveTasks } from '@/lib/taskTimeTracker';
import { sendWhatsAppMessage, cleanPhoneNumber } from '@/lib/whatsappService';

/**
 * GET /api/tasklist/stop-all-active
 * Health check endpoint for cron job monitoring
 */
export async function GET(request: NextRequest) {
  try {
    // Get active tasks count
    const activeTasks = await getActiveTasks();
    
    return NextResponse.json({
      status: 'ok',
      service: 'stop-all-active-tasks',
      timestamp: new Date().toISOString(),
      activeTasksCount: activeTasks.length,
      message: 'Service is running. Use POST method to stop all active tasks.'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      service: 'stop-all-active-tasks',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/tasklist/stop-all-active
 * Stop all currently active tasks and send WhatsApp notifications to programmers
 * 
 * PUBLIC ENDPOINT - No authentication required (for cron job)
 */
export async function POST(request: NextRequest) {
  try {
    // Default values for automated cron job
    const initiatedBy = 'Cron Job (Automated)';
    const userId = 1; // System user ID
    const isCronJob = true;

    // Parse request body for optional reason
    const body = await request.json().catch(() => ({}));
    const { reason, sendAdminNotification = true } = body;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[StopAllActive] 🛑 Starting stop all active tasks process');
    console.log('[StopAllActive] Initiated by:', initiatedBy);
    console.log('[StopAllActive] Reason:', reason || 'No reason provided');
    console.log('[StopAllActive] Timestamp:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));

    // Get all active tasks
    const activeTasks = await getActiveTasks();
    
    if (activeTasks.length === 0) {
      console.log('[StopAllActive] ℹ️ No active tasks found');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return NextResponse.json({
        success: true,
        message: 'No active tasks to stop',
        stoppedCount: 0,
        tasks: []
      });
    }

    console.log('[StopAllActive] 📋 Found', activeTasks.length, 'active tasks');

    const results = [];
    const now = new Date();

    // Process each active task
    for (const task of activeTasks) {
      try {
        console.log(`[StopAllActive] Processing task ${task.id}...`);

        // Calculate current session duration
        let additionalMinutes = 0;
        if (task.startedAt && !task.isPaused) {
          const sessionDuration = now.getTime() - task.startedAt.getTime();
          additionalMinutes = Math.floor(sessionDuration / (1000 * 60));
        }

        const finalDuration = task.totalDurationMinutes + additionalMinutes;

        // Update task to paused status
        const updatedTask = await prisma.tasklist.update({
          where: { id: task.id },
          data: {
            status: 'SEDANG_DIPROSES_USER_PAUSED',
            pausedAt: now,
            totalDurationMinutes: finalDuration,
            isPaused: true
          },
          include: {
            pegawai: {
              select: {
                id: true,
                namaLengkap: true,
                noHp: true
              }
            },
            project: {
              select: {
                namaProyek: true
              }
            },
            module: {
              select: {
                nama: true,
                kode: true
              }
            }
          }
        });

        // Log the action
        const logMessage = reason 
          ? `Task dihentikan secara massal oleh ${initiatedBy}. Alasan: ${reason}`
          : `Task dihentikan secara massal oleh ${initiatedBy}`;

        await prisma.$executeRaw`
          INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action, "totalStartStopMinutes")
          VALUES (${task.id}, (${now}::timestamptz AT TIME ZONE 'Asia/Jakarta')::timestamp, ${userId}, ${logMessage}, NULL, ${'STOP_ALL'}, ${Math.round(additionalMinutes)})
        `;

        console.log(`[StopAllActive] ✅ Task ${task.id} stopped successfully`);

        // Send WhatsApp notification to programmer
        let whatsappSent = false;
        let whatsappError = null;

        if (updatedTask.pegawai?.noHp) {
          try {
            const cleanPhone = cleanPhoneNumber(updatedTask.pegawai.noHp);
            
            if (cleanPhone) {
              // Get current hour for greeting
              const currentHour = new Date().getHours();
              let greeting = 'Selamat pagi';
              if (currentHour >= 12 && currentHour < 15) {
                greeting = 'Selamat siang';
              } else if (currentHour >= 15 && currentHour < 18) {
                greeting = 'Selamat sore';
              } else if (currentHour >= 18 || currentHour < 6) {
                greeting = 'Selamat malam';
              }

              const moduleCode = updatedTask.module?.kode || '-';
              const moduleName = updatedTask.module?.nama || '-';
              const projectName = updatedTask.project?.namaProyek || '-';

              const message = `${greeting} ${updatedTask.pegawai.namaLengkap},

🛑 *TASK DIHENTIKAN SECARA OTOMATIS*

📋 *Kode Task:* ${updatedTask.kode}
🏢 *Proyek:* ${projectName}
📁 *Modul:* ${moduleCode} - ${moduleName}
⏱️ *Total Durasi:* ${finalDuration} menit${reason ? `

📝 *Alasan:*
${reason}` : ''}

Task Anda telah dihentikan sementara. Anda dapat melanjutkan kembali kapan saja melalui sistem.

_(Pesan otomatis dari Richz-Log)_`;

              const waResult = await sendWhatsAppMessage({
                to: cleanPhone,
                message: message,
                taskId: task.id,
                notificationType: 'task_review'
              });

              whatsappSent = waResult.success;
              if (!waResult.success) {
                whatsappError = waResult.error;
                console.error(`[StopAllActive] ❌ WhatsApp failed for task ${task.id}:`, waResult.error);
              } else {
                console.log(`[StopAllActive] ✅ WhatsApp sent to ${updatedTask.pegawai.namaLengkap}`);
              }
            } else {
              whatsappError = 'Invalid phone number format';
              console.warn(`[StopAllActive] ⚠️ Invalid phone number for task ${task.id}`);
            }
          } catch (waError) {
            whatsappError = waError instanceof Error ? waError.message : 'Unknown error';
            console.error(`[StopAllActive] ❌ WhatsApp error for task ${task.id}:`, waError);
          }
        } else {
          whatsappError = 'No phone number available';
          console.warn(`[StopAllActive] ⚠️ No phone number for task ${task.id}`);
        }

        results.push({
          taskId: task.id,
          taskCode: updatedTask.kode,
          programmerId: updatedTask.pegawai?.id,
          programmerName: updatedTask.pegawai?.namaLengkap,
          projectName: updatedTask.project?.namaProyek,
          moduleName: updatedTask.module?.nama,
          sessionDuration: additionalMinutes,
          totalDuration: finalDuration,
          stopped: true,
          whatsappSent,
          whatsappError
        });

      } catch (taskError) {
        console.error(`[StopAllActive] ❌ Error stopping task ${task.id}:`, taskError);
        results.push({
          taskId: task.id,
          taskCode: 'Unknown',
          stopped: false,
          error: taskError instanceof Error ? taskError.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.stopped).length;
    const failedCount = results.filter(r => !r.stopped).length;
    const whatsappSuccessCount = results.filter(r => r.whatsappSent).length;

    console.log('[StopAllActive] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[StopAllActive] 📊 Summary:');
    console.log('[StopAllActive] Total tasks:', activeTasks.length);
    console.log('[StopAllActive] Successfully stopped:', successCount);
    console.log('[StopAllActive] Failed:', failedCount);
    console.log('[StopAllActive] WhatsApp sent:', whatsappSuccessCount);
    console.log('[StopAllActive] WhatsApp failed:', successCount - whatsappSuccessCount);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Send summary notification to admin (only for cron jobs or if requested)
    if ((isCronJob || sendAdminNotification) && successCount > 0) {
      try {
        // Get admin phone numbers (users with PM/Admin role)
        const admins = await prisma.pegawai.findMany({
          where: {
            role: { in: ['PM', 'ADMIN'] },
            noHp: { not: '' }
          },
          select: {
            namaLengkap: true,
            noHp: true
          },
          take: 3 // Limit to 3 admins to avoid spam
        });

        const currentHour = new Date().getHours();
        let greeting = 'Selamat pagi';
        if (currentHour >= 12 && currentHour < 15) {
          greeting = 'Selamat siang';
        } else if (currentHour >= 15 && currentHour < 18) {
          greeting = 'Selamat sore';
        } else if (currentHour >= 18 || currentHour < 6) {
          greeting = 'Selamat malam';
        }

        // Build task list (max 10 tasks)
        const taskList = results
          .filter(r => r.stopped)
          .slice(0, 10)
          .map(r => `• ${r.taskCode} - ${r.programmerName}`)
          .join('\n');

        const moreTasksText = successCount > 10 ? `\n... dan ${successCount - 10} task lainnya` : '';

        const summaryMessage = `${greeting},

🛑 *LAPORAN AUTO-STOP TASK*

📊 *Ringkasan:*
✅ Berhasil dihentikan: ${successCount} task
❌ Gagal: ${failedCount} task
📱 WhatsApp terkirim: ${whatsappSuccessCount}
📱 WhatsApp gagal: ${successCount - whatsappSuccessCount}

📋 *Daftar Task:*
${taskList}${moreTasksText}${reason ? `

📝 *Alasan:*
${reason}` : ''}

⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
🤖 *Dipicu oleh:* ${initiatedBy}

_(Pesan otomatis dari Richz-Log)_`;

        // Send to each admin
        for (const admin of admins) {
          if (admin.noHp) {
            const cleanPhone = cleanPhoneNumber(admin.noHp);
            if (cleanPhone) {
              sendWhatsAppMessage({
                to: cleanPhone,
                message: summaryMessage,
                notificationType: 'daily_summary'
              }).catch(err => {
                console.error(`[StopAllActive] Failed to send summary to ${admin.namaLengkap}:`, err);
              });
            }
          }
        }

        console.log(`[StopAllActive] 📱 Summary notification sent to ${admins.length} admin(s)`);
      } catch (notifError) {
        console.error('[StopAllActive] ⚠️ Failed to send admin notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully stopped ${successCount} out of ${activeTasks.length} active tasks`,
      stoppedCount: successCount,
      failedCount,
      whatsappSuccessCount,
      whatsappFailedCount: successCount - whatsappSuccessCount,
      reason: reason || null,
      initiatedBy,
      isCronJob,
      timestamp: now.toISOString(),
      tasks: results
    });

  } catch (error) {
    console.error('[StopAllActive] ❌ Fatal error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
