import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';
import { notifyCreatorAndPM, logTaskActivity } from './notificationHelper';
import { getUserBreakTime } from '@/lib/breakTimeService';

/**
 * Task Time Tracking Service
 * Handles start, pause, resume, and stop functionality for tasks
 */

export interface TaskTimeInfo {
  id: number;
  status: TaskStatus;
  startedAt: Date | null;
  pausedAt: Date | null;
  totalDurationMinutes: number;
  isPaused: boolean;
  isActive: boolean;
  currentSessionMinutes: number;
}

/**
 * Start a task - changes status to SEDANG_DIPROSES_USER and records start time
 */
export async function startTask(taskId: number, userId: number): Promise<TaskTimeInfo | null> {
  try {
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        pegawaiId: true,
        startedAt: true,
        pausedAt: true,
        totalDurationMinutes: true,
        isPaused: true,
        kode: true
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Only allow the assigned user to start the task
    if (task.pegawaiId !== userId) {
      throw new Error('Only the assigned user can start this task');
    }

    // Can only start tasks that are waiting, paused, or already in progress (for resume)
    if (task.status !== 'MENUNGGU_PROSES_USER' && 
        task.status !== 'SEDANG_DIPROSES_USER_PAUSED' && 
        task.status !== 'SEDANG_DIPROSES_USER') {
      throw new Error('Task cannot be started in current status');
    }

    // Check if user already has an active task running
    // We want to prevent starting OR resuming if another task is currently active
    const activeTasks = await getActiveTasks(userId);
    const otherActiveTasks = activeTasks.filter(t => t.id !== taskId);
    
    if (otherActiveTasks.length > 0) {
      // Get the active task details
      const activeTask = await prisma.tasklist.findUnique({
        where: { id: otherActiveTasks[0].id },
        select: {
          kode: true
        }
      });
      
      const activeTaskName = activeTask?.kode || `Task ID ${otherActiveTasks[0].id}`;
      throw new Error(`ACTIVE_TASK_EXISTS:You already have an active task running: "${activeTaskName}". Please stop or complete it before starting a new task.`);
    }

    const now = new Date();
    const previousStatus = task.status;
    
    const updatedTask = await prisma.tasklist.update({
      where: { id: taskId },
      data: {
        status: 'SEDANG_DIPROSES_USER',
        startedAt: now,
        pausedAt: null,
        isPaused: false
      }
    });

    // ✅ Send notifications to creator + PM
    try {
      const taskDetails = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { kode: true, createdBy: true, projectId: true }
      });
      
      if (taskDetails) {
        const userInfo = await prisma.pegawai.findUnique({
          where: { id: userId },
          select: { namaLengkap: true }
        });
        
        const userName = userInfo?.namaLengkap || 'User';
        
        // Different message for first start vs resume
        const isFirstStart = previousStatus === 'MENUNGGU_PROSES_USER';
        const title = isFirstStart ? 'Task Dimulai' : 'Task Dilanjutkan';
        const message = isFirstStart 
          ? `Task ${taskDetails.kode} telah dimulai oleh ${userName}`
          : `Task ${taskDetails.kode} telah dilanjutkan oleh ${userName}`;
        
        console.log(`🔔 [startTask] Sending notifications for task ${taskId} (${taskDetails.kode}) - ${isFirstStart ? 'START' : 'RESUME'}`);
        
        // Log activity
        await logTaskActivity({
          taskId,
          userId,
          action: 'STATUS_CHANGE',
          fromStatus: previousStatus,
          toStatus: 'SEDANG_DIPROSES_USER'
        });
        
        // Notify creator + PM
        await notifyCreatorAndPM({
          taskId,
          eventType: 'task.status.changed',
          template: {
            title,
            message,
            priority: 'medium'
          },
          fromUserId: userId,
          fromUserName: userName
        });
        
        console.log(`✅ [startTask] Notifications sent for task ${taskId}`);
      }
    } catch (notifError) {
      console.error('❌ [startTask] Failed to send notifications:', notifError);
    }

    // Log the action
    // Format time in WIB (don't use toISOString which converts to UTC)
    const timeStr = now.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T');
    await logTaskTimeAction(taskId, userId, 'START', `Task started at ${timeStr}`, now);

    return {
      id: updatedTask.id,
      status: updatedTask.status,
      startedAt: updatedTask.startedAt,
      pausedAt: updatedTask.pausedAt,
      totalDurationMinutes: updatedTask.totalDurationMinutes,
      isPaused: updatedTask.isPaused,
      isActive: true,
      currentSessionMinutes: 0
    };
  } catch (error) {
    console.error('Error starting task:', error);
    throw error;
  }
}

/**
 * Calculate duration excluding break time
 */
async function calculateDurationExcludingBreakTime(
  startTime: Date,
  endTime: Date,
  userId: number
): Promise<number> {
  try {
    const breakTime = await getUserBreakTime(userId);
    if (!breakTime) {
      // No break time, return full duration
      return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    }

    // Parse break time
    const [breakStartHour, breakStartMin] = breakTime.startTime.split(':').map(Number);
    const [breakEndHour, breakEndMin] = breakTime.endTime.split(':').map(Number);

    const breakStartTotalMin = breakStartHour * 60 + breakStartMin;
    const breakEndTotalMin = breakEndHour * 60 + breakEndMin;

    let totalDuration = 0;
    let currentTime = new Date(startTime);

    // Iterate through each minute and check if it's in break time
    while (currentTime < endTime) {
      const hour = currentTime.getHours();
      const min = currentTime.getMinutes();
      const currentTotalMin = hour * 60 + min;

      // Check if current time is NOT in break time
      if (!(currentTotalMin >= breakStartTotalMin && currentTotalMin < breakEndTotalMin)) {
        totalDuration++;
      }

      // Move to next minute
      currentTime.setMinutes(currentTime.getMinutes() + 1);
    }

    console.log(`📊 [Duration] Total: ${Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))} min, Break: ${breakEndTotalMin - breakStartTotalMin} min, Working: ${totalDuration} min`);

    return totalDuration;
  } catch (error) {
    console.error('❌ [Duration] Failed to calculate duration excluding break time:', error);
    // Fallback to full duration
    return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }
}

/**
 * Pause a task - changes status to SEDANG_DIPROSES_USER_PAUSED and updates duration
 */
export async function pauseTask(taskId: number, userId: number): Promise<TaskTimeInfo | null> {
  try {
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        pegawaiId: true,
        startedAt: true,
        pausedAt: true,
        totalDurationMinutes: true,
        isPaused: true
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.pegawaiId !== userId) {
      throw new Error('Only the assigned user can pause this task');
    }

    if (task.status !== 'SEDANG_DIPROSES_USER' || task.isPaused) {
      throw new Error('Task is not currently active');
    }

    const now = new Date();
    let additionalMinutes = 0;

    // Calculate time spent in current session, excluding break time
    if (task.startedAt) {
      additionalMinutes = await calculateDurationExcludingBreakTime(task.startedAt, now, userId);
    }

    const newTotalDuration = task.totalDurationMinutes + additionalMinutes;

    const updatedTask = await prisma.tasklist.update({
      where: { id: taskId },
      data: {
        status: 'SEDANG_DIPROSES_USER_PAUSED',
        pausedAt: now,
        totalDurationMinutes: newTotalDuration,
        isPaused: true
      }
    });

    // ✅ Send notifications to creator + PM for pause
    try {
      const taskDetails = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { kode: true, createdBy: true, projectId: true }
      });
      
      if (taskDetails) {
        const userInfo = await prisma.pegawai.findUnique({
          where: { id: userId },
          select: { namaLengkap: true }
        });
        
        const userName = userInfo?.namaLengkap || 'User';
        
        console.log(`🔔 [pauseTask] Sending notifications for task ${taskId} (${taskDetails.kode})`);
        
        // Log activity
        await logTaskActivity({
          taskId,
          userId,
          action: 'STATUS_CHANGE',
          fromStatus: 'SEDANG_DIPROSES_USER',
          toStatus: 'SEDANG_DIPROSES_USER_PAUSED'
        });
        
        // Notify creator + PM
        await notifyCreatorAndPM({
          taskId,
          eventType: 'task.status.changed',
          template: {
            title: 'Task Dihentikan Sementara',
            message: `Task ${taskDetails.kode} telah dihentikan sementara oleh ${userName}`,
            priority: 'medium'
          },
          fromUserId: userId,
          fromUserName: userName
        });
        
        console.log(`✅ [pauseTask] Notifications sent for task ${taskId}`);
      }
    } catch (notifError) {
      console.error('❌ [pauseTask] Failed to send notifications:', notifError);
    }

    // Log the action
    // Format time in WIB (don't use toISOString which converts to UTC)
    const timeStr = now.toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(' ', 'T');
    await logTaskTimeAction(taskId, userId, 'PAUSE', `Task paused at ${timeStr}, session duration: ${additionalMinutes} minutes`, now);

    return {
      id: updatedTask.id,
      status: updatedTask.status,
      startedAt: updatedTask.startedAt,
      pausedAt: updatedTask.pausedAt,
      totalDurationMinutes: updatedTask.totalDurationMinutes,
      isPaused: updatedTask.isPaused,
      isActive: false,
      currentSessionMinutes: 0
    };
  } catch (error) {
    console.error('Error pausing task:', error);
    throw error;
  }
}

/**
 * Resume a paused task
 */
export async function resumeTask(taskId: number, userId: number): Promise<TaskTimeInfo | null> {
  return startTask(taskId, userId); // Same logic as starting
}

/**
 * Stop/pause a task - saves current progress without sending for review
 */
export async function stopTask(taskId: number, userId: number): Promise<TaskTimeInfo | null> {
  try {
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        pegawaiId: true,
        startedAt: true,
        pausedAt: true,
        totalDurationMinutes: true,
        isPaused: true
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.pegawaiId !== userId) {
      throw new Error('Only the assigned user can stop this task');
    }

    if (task.status !== 'SEDANG_DIPROSES_USER' && task.status !== 'SEDANG_DIPROSES_USER_PAUSED') {
      throw new Error('Task is not in progress');
    }

    const now = new Date();
    let additionalMinutes = 0;

    // If task is currently active (not paused), calculate current session time excluding break time
    if (task.status === 'SEDANG_DIPROSES_USER' && task.startedAt && !task.isPaused) {
      additionalMinutes = await calculateDurationExcludingBreakTime(task.startedAt, now, userId);
    }

    const finalDuration = task.totalDurationMinutes + additionalMinutes;

    const updatedTask = await prisma.tasklist.update({
      where: { id: taskId },
      data: {
        status: 'SEDANG_DIPROSES_USER_PAUSED', // Set to paused status
        pausedAt: now,
        totalDurationMinutes: finalDuration,
        isPaused: true
      }
    });

    // ✅ Send notifications to creator + PM for stop
    try {
      const taskDetails = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { kode: true, createdBy: true, projectId: true }
      });
      
      if (taskDetails) {
        const userInfo = await prisma.pegawai.findUnique({
          where: { id: userId },
          select: { namaLengkap: true }
        });
        
        const userName = userInfo?.namaLengkap || 'User';
        
        console.log(`🔔 [stopTask] Sending notifications for task ${taskId} (${taskDetails.kode})`);
        
        // Log activity
        await logTaskActivity({
          taskId,
          userId,
          action: 'STATUS_CHANGE',
          fromStatus: task.status,
          toStatus: 'SEDANG_DIPROSES_USER_PAUSED'
        });
        
        // Notify creator + PM
        await notifyCreatorAndPM({
          taskId,
          eventType: 'task.status.changed',
          template: {
            title: 'Task Dihentikan',
            message: `Task ${taskDetails.kode} telah dihentikan oleh ${userName}`,
            priority: 'medium'
          },
          fromUserId: userId,
          fromUserName: userName
        });
        
        console.log(`✅ [stopTask] Notifications sent for task ${taskId}`);
      }
    } catch (notifError) {
      console.error('❌ [stopTask] Failed to send notifications:', notifError);
    }

    // Log the action
    await logTaskTimeAction(taskId, userId, 'STOP', `Task stopped/paused. Total duration: ${finalDuration} minutes`, now);

    return {
      id: updatedTask.id,
      status: updatedTask.status,
      startedAt: updatedTask.startedAt,
      pausedAt: updatedTask.pausedAt,
      totalDurationMinutes: updatedTask.totalDurationMinutes,
      isPaused: updatedTask.isPaused,
      isActive: false,
      currentSessionMinutes: 0
    };
  } catch (error) {
    console.error('Error stopping task:', error);
    throw error;
  }
}

/**
 * Complete a task and send for review - updates final duration and changes status to review
 */
export async function completeTask(taskId: number, userId: number, programmerNote?: string, hasImage?: boolean): Promise<TaskTimeInfo | null> {
  try {
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        pegawaiId: true,
        startedAt: true,
        pausedAt: true,
        totalDurationMinutes: true,
        isPaused: true
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.pegawaiId !== userId) {
      throw new Error('Only the assigned user can complete this task');
    }

    if (task.status !== 'SEDANG_DIPROSES_USER' && task.status !== 'SEDANG_DIPROSES_USER_PAUSED') {
      throw new Error('Task is not in progress');
    }

    const now = new Date();
    let additionalMinutes = 0;

    // If task is currently active (not paused), calculate current session time excluding break time
    if (task.status === 'SEDANG_DIPROSES_USER' && task.startedAt && !task.isPaused) {
      additionalMinutes = await calculateDurationExcludingBreakTime(task.startedAt, now, userId);
    }

    const finalDuration = task.totalDurationMinutes + additionalMinutes;

    // Prepare update data
    const updateData: any = {
      totalDurationMinutes: finalDuration,
      status: 'MENUNGGU_REVIEW_PM'
    };

    // Save programmer description if provided
    if (programmerNote) {
      updateData.programmerDescription = programmerNote;
    }

    const updatedTask = await prisma.tasklist.update({
      where: { id: taskId },
      data: updateData
    });

    // ✅ Send notifications to creator + PM
    try {
      const taskDetails = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { kode: true, createdBy: true, projectId: true }
      });
      
      if (taskDetails) {
        const userInfo = await prisma.pegawai.findUnique({
          where: { id: userId },
          select: { namaLengkap: true }
        });
        
        const userName = userInfo?.namaLengkap || 'User';
        
        console.log(`🔔 [completeTask] Sending notifications for task ${taskId} (${taskDetails.kode})`);
        
        // Log activity
        await logTaskActivity({
          taskId,
          userId,
          action: 'STATUS_CHANGE',
          fromStatus: task.status,
          toStatus: 'MENUNGGU_REVIEW_PM',
          note: programmerNote
        });
        
        // Notify creator + PM
        await notifyCreatorAndPM({
          taskId,
          eventType: 'task.submitted',
          template: {
            title: 'Task Disubmit untuk Review',
            message: `Task ${taskDetails.kode} telah disubmit oleh ${userName}`,
            priority: 'high'
          },
          fromUserId: userId,
          fromUserName: userName
        });
        
        console.log(`✅ [completeTask] Notifications sent for task ${taskId}`);
      }
    } catch (notifError) {
      console.error('❌ [completeTask] Failed to send notifications:', notifError);
    }

    // Create log only if there's no image
    // If there's an image, the log will be created by the API endpoint with imagePath
    if (!hasImage) {
      if (programmerNote) {
        const logMessage = `Task dikirim untuk review\n\nKeterangan dari programmer:\n${programmerNote}`;
        await logTaskTimeAction(taskId, userId, 'STATUS_CHANGE', logMessage, now);
      } else {
        await logTaskTimeAction(taskId, userId, 'STATUS_CHANGE', 'Task dikirim untuk review', now);
      }
    }

    return {
      id: updatedTask.id,
      status: updatedTask.status,
      startedAt: updatedTask.startedAt,
      pausedAt: updatedTask.pausedAt,
      totalDurationMinutes: updatedTask.totalDurationMinutes,
      isPaused: updatedTask.isPaused,
      isActive: false,
      currentSessionMinutes: 0
    };
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
}

/**
 * Get current time tracking info for a task
 */
export async function getTaskTimeInfo(taskId: number, userId?: number): Promise<TaskTimeInfo | null> {
  try {
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        pegawaiId: true,
        startedAt: true,
        pausedAt: true,
        totalDurationMinutes: true,
        isPaused: true
      }
    });

    if (!task) {
      return null;
    }

    let currentSessionMinutes = 0;
    const isActive = task.status === 'SEDANG_DIPROSES_USER' && !task.isPaused;

    // Calculate current session time if task is active, excluding break time
    if (isActive && task.startedAt) {
      const now = new Date();
      const userIdToUse = userId || task.pegawaiId;
      if (userIdToUse) {
        currentSessionMinutes = await calculateDurationExcludingBreakTime(task.startedAt, now, userIdToUse);
      } else {
        // Fallback if no user ID available
        currentSessionMinutes = Math.floor((now.getTime() - task.startedAt.getTime()) / (1000 * 60));
      }
    }

    return {
      id: task.id,
      status: task.status,
      startedAt: task.startedAt,
      pausedAt: task.pausedAt,
      totalDurationMinutes: task.totalDurationMinutes,
      isPaused: task.isPaused,
      isActive,
      currentSessionMinutes
    };
  } catch (error) {
    console.error('Error getting task time info:', error);
    return null;
  }
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Log task time tracking actions
 */
async function logTaskTimeAction(taskId: number, userId: number, action: string, details: string, timestamp?: Date): Promise<void> {
  try {
    // Use provided timestamp or current time
    const waktu = timestamp || new Date();
    
    // Calculate totalStartStopMinutes for all actions
    let totalStartStopMinutes = 0;
    
    // Get all logs for this task to find most recent START
    const logs = await prisma.tasklistLog.findMany({
      where: { taskId },
      orderBy: { waktu: 'asc' }
    });

    let lastStartTime: Date | null = null;
    
    // Find the most recent START before this log entry
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      const logAction = log.action?.toLowerCase() || '';
      const fullText = `${logAction} ${log.keterangan?.toLowerCase() || ''}`.toLowerCase();

      if (logAction.includes('task started') || logAction === 'start' || fullText.includes('task started')) {
        lastStartTime = log.waktu;
        break;
      }
    }

    // If this is a STOP action and we have a START, calculate duration
    if ((action === 'STOP' || action === 'PAUSE') && lastStartTime) {
      totalStartStopMinutes = (waktu.getTime() - lastStartTime.getTime()) / (1000 * 60);
      // Only save if duration is positive
      if (totalStartStopMinutes < 0) {
        totalStartStopMinutes = 0;
      }
    }
    
    // Use the existing tasklist_log table structure
    // Use AT TIME ZONE to ensure timestamp is stored in WIB
    await prisma.$executeRaw`
      INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action, "totalStartStopMinutes")
      VALUES (${taskId}, (${waktu}::timestamptz AT TIME ZONE 'Asia/Jakarta')::timestamp, ${userId}, ${details}, NULL, ${action}, ${Math.round(totalStartStopMinutes)})
    `;
  } catch (error) {
    console.error('Error logging task time action:', error);
    // Don't throw - logging failure shouldn't break the main functionality
  }
}

/**
 * Get all active tasks (currently being worked on)
 */
export async function getActiveTasks(userId?: number): Promise<TaskTimeInfo[]> {
  try {
    const whereClause: any = {
      status: 'SEDANG_DIPROSES_USER',
      isPaused: false,
      startedAt: { not: null }
    };

    if (userId) {
      whereClause.pegawaiId = userId;
    }

    const tasks = await prisma.tasklist.findMany({
      where: whereClause,
      select: {
        id: true,
        status: true,
        startedAt: true,
        pausedAt: true,
        totalDurationMinutes: true,
        isPaused: true,
        kode: true
      }
    });

    return tasks.map(task => {
      let currentSessionMinutes = 0;
      if (task.startedAt) {
        const now = new Date();
        const sessionDuration = now.getTime() - task.startedAt.getTime();
        currentSessionMinutes = Math.floor(sessionDuration / (1000 * 60));
      }

      return {
        id: task.id,
        status: task.status,
        startedAt: task.startedAt,
        pausedAt: task.pausedAt,
        totalDurationMinutes: task.totalDurationMinutes,
        isPaused: task.isPaused,
        isActive: true,
        currentSessionMinutes
      };
    });
  } catch (error) {
    console.error('Error getting active tasks:', error);
    return [];
  }
}
