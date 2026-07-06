import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { startTask, pauseTask, resumeTask, stopTask, completeTask, getTaskTimeInfo } from '@/lib/taskTimeTracker';
import { sendWhatsAppMessage, cleanPhoneNumber } from '@/lib/whatsappService';
import { prisma } from '@/lib/prisma';
import { clockInTask, clockOutTask } from '@/lib/crmNotificationService';
import { updateProgrammerStatus, checkActiveTasks, getActiveTaskInfo } from '@/lib/programmerStatus';
import { validateCurrentUserWorkingHours, validateProgrammerActionTime, createWorkingHoursErrorResponse } from '@/lib/taskValidation';

// ✅ REQUEST DEDUPLICATION - Prevent duplicate API calls (e.g., double click)
// Key format: "taskId-action-userId"
// Value: timestamp of last request
const requestCache = new Map<string, number>();
const REQUEST_DEDUP_WINDOW_MS = 2000; // 2 seconds

/**
 * Check if request should be processed (prevent duplicate API calls)
 */
function shouldProcessRequest(taskId: number, action: string, userId: number): boolean {
  const cacheKey = `${taskId}-${action}-${userId}`;
  const now = Date.now();
  const lastProcessed = requestCache.get(cacheKey);

  if (lastProcessed && (now - lastProcessed) < REQUEST_DEDUP_WINDOW_MS) {
    const msAgo = now - lastProcessed;
    console.log(`⏭️  [API Dedup] BLOCKED - Same request ${msAgo}ms ago (key: ${cacheKey})`);
    return false;
  }

  // Mark as processed
  requestCache.set(cacheKey, now);

  // Cleanup old entries
  for (const [key, timestamp] of requestCache.entries()) {
    if (now - timestamp > 10000) requestCache.delete(key);
  }

  return true;
}

// GET /api/tasklist/[id]/time-tracking - Get current time tracking info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);
    if (!taskId || isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const timeInfo = await getTaskTimeInfo(taskId);
    if (!timeInfo) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(timeInfo);
  } catch (error) {
    console.error('Error getting task time info:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/tasklist/[id]/time-tracking - Perform time tracking actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = parseInt(resolvedParams.id);
    if (!taskId || isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, note, hasImage } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // ✅ REQUEST DEDUPLICATION - Prevent duplicate API calls (e.g., double click)
    if (!shouldProcessRequest(taskId, action, session.user.id)) {
      console.log(`⏭️  [API Dedup] Returning success for duplicate request: task ${taskId}, action: ${action}`);
      return NextResponse.json({
        success: true,
        action: action.toLowerCase(),
        message: 'Request already processed (duplicate prevented)',
        deduplicated: true
      });
    }

    let result;
    const userId = session.user.id;
    const taskCrm = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: { idCrm: true }
    });

    switch (action.toLowerCase()) {
      case 'start':
        // Validasi jam kerja dari RichzSpot API (user-specific berdasarkan shift)
        const workingHoursCheck = await validateCurrentUserWorkingHours(userId.toString());
        
        if (!workingHoursCheck.isWorkingHours) {
          console.log(`⏰ [Working Hours] Task start blocked - outside working hours`);
          console.log(`   Current time: ${workingHoursCheck.currentTime}`);
          console.log(`   Working hours: ${workingHoursCheck.workingHoursStart} - ${workingHoursCheck.workingHoursEnd}`);
          
          return NextResponse.json({
            error: 'OUTSIDE_WORKING_HOURS',
            message: `Tidak dapat memulai task di luar jam kerja. ${workingHoursCheck.message}`,
            workingHours: {
              start: workingHoursCheck.workingHoursStart,
              end: workingHoursCheck.workingHoursEnd,
              currentTime: workingHoursCheck.currentTime
            }
          }, { status: 400 });
        }
        
        console.log(`✅ [Working Hours] Task start allowed - within working hours`);
        
        // Validasi task CRM sebelum start
        if (taskCrm?.idCrm) {
          const task = await prisma.tasklist.findUnique({
            where: { id: taskId },
            select: { 
              idCrm: true, 
              scheduleAt: true, 
              customDurationHours: true 
            }
          });
          
          if (task) {
            const isDefaultSchedule = task.scheduleAt.getHours() === 0 && 
                                      task.scheduleAt.getMinutes() === 0;
            const durationValue = task.customDurationHours ? Number(task.customDurationHours) : 0;
            const hasNoDuration = durationValue <= 0;
            
            if (isDefaultSchedule || hasNoDuration) {
              return NextResponse.json({
                error: 'VALIDATION_REQUIRED',
                message: 'Task dari CRM belum divalidasi. Set jadwal dan durasi pengerjaan terlebih dahulu.',
                needsValidation: true,
                currentSchedule: task.scheduleAt,
                currentDuration: durationValue,
                missingFields: {
                  scheduleAt: isDefaultSchedule,
                  customDurationHours: hasNoDuration
                }
              }, { status: 400 });
            }
          }
          
          await clockInTask(taskCrm?.idCrm);
        }
        result = await startTask(taskId, userId);
        break;

      case 'pause':
        // ✅ Validasi jam kerja - programmer tidak boleh pause di luar jam kerja
        const pauseValidation = await validateProgrammerActionTime(userId.toString(), 'pause');
        if (!pauseValidation.isAllowed) {
          console.log(`⏰ [Working Hours] Task pause blocked - outside working hours`);
          return NextResponse.json(
            createWorkingHoursErrorResponse(pauseValidation),
            { status: 400 }
          );
        }
        console.log(`✅ [Working Hours] Task pause allowed - within working hours`);
        
        if (taskCrm?.idCrm) {
          await clockOutTask(taskCrm?.idCrm);
        }
        result = await pauseTask(taskId, userId);
        break;

      case 'resume':
        // ✅ Validasi jam kerja - programmer tidak boleh resume di luar jam kerja
        const resumeValidation = await validateProgrammerActionTime(userId.toString(), 'resume');
        if (!resumeValidation.isAllowed) {
          console.log(`⏰ [Working Hours] Task resume blocked - outside working hours`);
          return NextResponse.json(
            createWorkingHoursErrorResponse(resumeValidation),
            { status: 400 }
          );
        }
        console.log(`✅ [Working Hours] Task resume allowed - within working hours`);
        
        if (taskCrm?.idCrm) {
          await clockInTask(taskCrm?.idCrm);
        }
        result = await resumeTask(taskId, userId);
        break;

      case 'stop':
        // ✅ Validasi jam kerja - programmer tidak boleh stop di luar jam kerja
        const stopValidation = await validateProgrammerActionTime(userId.toString(), 'stop');
        if (!stopValidation.isAllowed) {
          console.log(`⏰ [Working Hours] Task stop blocked - outside working hours`);
          return NextResponse.json(
            createWorkingHoursErrorResponse(stopValidation),
            { status: 400 }
          );
        }
        console.log(`✅ [Working Hours] Task stop allowed - within working hours`);
        
        if (taskCrm?.idCrm) {
          await clockOutTask(taskCrm?.idCrm);
        }
        result = await stopTask(taskId, userId);
        break;

      case 'complete':
        // ✅ Validasi jam kerja - programmer tidak boleh complete di luar jam kerja
        const completeValidation = await validateProgrammerActionTime(userId.toString(), 'complete');
        if (!completeValidation.isAllowed) {
          console.log(`⏰ [Working Hours] Task complete blocked - outside working hours`);
          return NextResponse.json(
            createWorkingHoursErrorResponse(completeValidation),
            { status: 400 }
          );
        }
        console.log(`✅ [Working Hours] Task complete allowed - within working hours`);
        
        result = await completeTask(taskId, userId, note, hasImage);
        break;

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: start, pause, resume, stop, complete'
        }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
    }

    // Auto-update programmer status based on action
    try {
      const task = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { pegawaiId: true, projectId: true, kode: true }
      });

      if (task) {
        const programmerId = task.pegawaiId;

        switch (action.toLowerCase()) {
          case 'start':
          case 'resume':
            // Task started/resumed → set status to Work
            const activeTaskInfo = await getActiveTaskInfo(programmerId);
            await updateProgrammerStatus({
              programmerId,
              status: 'Work',
              notes: activeTaskInfo,
              updatedBy: userId
            });
            console.log(`✅ Programmer ${programmerId} status updated to Work`);
            break;

          case 'stop':
          case 'pause':
          case 'complete':
            // Task stopped/paused/completed → check if programmer has other active tasks
            const hasOtherTasks = await checkActiveTasks(programmerId);
            if (hasOtherTasks) {
              // Still has active tasks → keep Work status but update notes
              const remainingTaskInfo = await getActiveTaskInfo(programmerId);
              await updateProgrammerStatus({
                programmerId,
                status: 'Work',
                notes: remainingTaskInfo,
                updatedBy: userId
              });
              console.log(`✅ Programmer ${programmerId} still has active tasks, status remains Work`);
            } else {
              // No more active tasks → set to Free
              await updateProgrammerStatus({
                programmerId,
                status: 'Free',
                notes: null,
                updatedBy: userId
              });
              console.log(`✅ Programmer ${programmerId} has no active tasks, status updated to Free`);
            }
            break;
        }
      }
    } catch (statusUpdateError) {
      console.error('[ProgrammerStatus] Auto-update failed (non-fatal):', statusUpdateError);
      // Don't fail the request if status update fails
    }

    // ✅ Send WhatsApp notification to PM for STOP/PAUSE/RESUME actions
    // (COMPLETE is handled by notifyPMForReview in route.ts)
    const shouldNotifyPM = ['stop', 'pause', 'resume'].includes(action.toLowerCase());
    
    if (shouldNotifyPM) {
      try {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🔔 [WA Stop/Pause] Starting notification for action: ${action}, taskId: ${taskId}`);

        const task = await prisma.tasklist.findUnique({
          where: { id: taskId },
          select: {
            id: true,
            kode: true,
            keterangan: true,
            projectId: true,
            moduleId: true,
            createdBy: true
          }
        });

        console.log(`📋 [WA Stop/Pause] Task info:`, {
          taskId: task?.id,
          taskCode: task?.kode,
          projectId: task?.projectId,
          createdBy: task?.createdBy
        });

        if (task) {
          // Get task creator (PM who created the task)
          let pmPegawai = null;
          
          console.log(`🔍 [WA Stop/Pause] Looking for task creator (createdBy): ${task.createdBy}`);
          
          if (task.createdBy) {
            pmPegawai = await prisma.pegawai.findUnique({
              where: { id: task.createdBy },
              select: { id: true, namaLengkap: true, noHp: true }
            });
            
            console.log(`👤 [WA Stop/Pause] Task creator found:`, pmPegawai ? {
              id: pmPegawai.id,
              name: pmPegawai.namaLengkap,
              hasPhone: !!pmPegawai.noHp,
              phone: pmPegawai.noHp ? `${pmPegawai.noHp.substring(0, 4)}****` : 'NO PHONE'
            } : 'NOT FOUND');
          }
          
          // Fallback: Find first PM in project
          if (!pmPegawai || !pmPegawai.noHp) {
            console.log(`🔍 [WA Stop/Pause] Fallback: Looking for first PM in project ${task.projectId}...`);
            
            const pmTeam = await prisma.proyekTeam.findFirst({
              where: {
                projectId: task.projectId,
                jabatan: { contains: 'PM' }
              }
            });

            console.log(`👥 [WA Stop/Pause] PM team member:`, pmTeam ? {
              pegawaiId: pmTeam.pegawaiId,
              jabatan: pmTeam.jabatan
            } : 'NOT FOUND');

            if (pmTeam) {
              pmPegawai = await prisma.pegawai.findUnique({
                where: { id: pmTeam.pegawaiId },
                select: { id: true, namaLengkap: true, noHp: true }
              });
              
              console.log(`👤 [WA Stop/Pause] Fallback PM found:`, pmPegawai ? {
                id: pmPegawai.id,
                name: pmPegawai.namaLengkap,
                hasPhone: !!pmPegawai.noHp,
                phone: pmPegawai.noHp ? `${pmPegawai.noHp.substring(0, 4)}****` : 'NO PHONE'
              } : 'NOT FOUND');
            }
          }

          if (pmPegawai && pmPegawai.noHp) {
            const cleanPhone = cleanPhoneNumber(pmPegawai.noHp);
            
            console.log(`📞 [WA Stop/Pause] Phone numbers:`, {
              original: pmPegawai.noHp,
              cleaned: cleanPhone
            });
            
            if (cleanPhone) {
              // Get module info
              const module = await prisma.proyekModule.findUnique({
                where: { id: task.moduleId },
                select: { kode: true, nama: true }
              });

              const statusMessage = action.toLowerCase() === 'stop' 
                ? `Task (${task.kode}) telah dihentikan sementara.`
                : action.toLowerCase() === 'pause'
                ? `Task (${task.kode}) telah di-pause.`
                : `Task (${task.kode}) telah dilanjutkan kembali.`;

              const message = `${pmPegawai.namaLengkap},

Kode: ${task.kode}
Modul: ${module?.kode || '-'} - ${module?.nama || '-'}
Keterangan: ${task.keterangan || '-'}

*${statusMessage}*

(Pesan otomatis dari Richz-Log)`;

              console.log(`📤 [WA Stop/Pause] Sending WhatsApp to: ${pmPegawai.namaLengkap} (${cleanPhone})`);
              console.log(`📝 [WA Stop/Pause] Message length: ${message.length} characters`);

              // Send notification (non-blocking)
              sendWhatsAppMessage({
                to: cleanPhone,
                message: message,
                taskId: taskId,
                notificationType: 'task_review'
              }).then(result => {
                if (result.success) {
                  console.log(`✅ [WA Stop/Pause] Notification sent successfully to: ${pmPegawai.namaLengkap}`);
                } else {
                  console.error(`❌ [WA Stop/Pause] Notification failed:`, result.error);
                }
                console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
              }).catch(error => {
                console.error('[WA Stop/Pause] Notification error:', error);
                console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
              });
            } else {
              console.warn(`⚠️ [WA Stop/Pause] Clean phone number failed for: ${pmPegawai.noHp}`);
              console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            }
          } else {
            console.warn(`⚠️ [WA Stop/Pause] PM not found or no phone number for project: ${task.projectId}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          }
        } else {
          console.warn(`⚠️ [WA Stop/Pause] Task ${taskId} not found`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        }
      } catch (notificationError) {
        console.error('[WA Stop/Pause] Notification setup failed (non-fatal):', notificationError);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      }
    }

    return NextResponse.json({
      success: true,
      action: action.toLowerCase(),
      timeInfo: result
    });

  } catch (error) {
    console.error('Error performing time tracking action:', error);

    // Return specific error messages for known errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('cannot be') || error.message.includes('Only the')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
