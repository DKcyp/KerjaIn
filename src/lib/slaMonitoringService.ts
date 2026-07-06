import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, formatSLAOverdueMessage, formatSLAWarningMessage, cleanPhoneNumber } from './whatsappService';

interface OverdueTask {
  id: number;
  kode: string;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  taskComplexity: 'EASY' | 'MEDIUM' | 'HARD';
  status: string;
  assigneeStartTaskDeadline: Date | null;
  assigneeWorkDeadline: Date | null;
  pmReviewDeadline: Date | null;
  scheduleAt: Date;
  // Joined data
  proyekNama?: string;
  moduleNama?: string;
  pegawaiNama?: string;
  pegawaiPhone?: string;
}

interface NotificationLog {
  taskId: number;
  pegawaiId: number;
  notificationType: 'overdue' | 'warning';
  sentAt: Date;
  messageId?: string;
}

/**
 * Main SLA monitoring function - checks all tasks and sends notifications
 */
export async function checkSLACompliance(): Promise<{
  overdueNotifications: number;
  warningNotifications: number;
  errors: string[];
}> {
  console.log('🔍 Starting SLA compliance check...');
  
  const results = {
    overdueNotifications: 0,
    warningNotifications: 0,
    errors: [] as string[]
  };

  try {
    // Get all active tasks that need SLA monitoring
    const activeTasks = await getActiveTasksWithSLA();
    console.log(`📋 Found ${activeTasks.length} active tasks to monitor`);

    const currentTime = new Date();
    
    for (const task of activeTasks) {
      try {
        const slaStatus = checkTaskSLAStatus(task, currentTime);
        
        if (slaStatus.shouldNotify && slaStatus.type !== 'none') {
          // TypeScript type assertion since we've already checked type !== 'none'
          const notificationSent = await sendSLANotification(task, slaStatus as { type: 'overdue' | 'warning'; deadline: Date | null; minutesDifference: number });
          
          if (notificationSent) {
            if (slaStatus.type === 'overdue') {
              results.overdueNotifications++;
            } else if (slaStatus.type === 'warning') {
              results.warningNotifications++;
            }
            
            // Log the notification
            await logNotification(task.id, task.pegawaiId, slaStatus.type, notificationSent.messageId);
          }
        }
      } catch (error) {
        const errorMsg = `Error processing task ${task.kode}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }
    
    console.log(`✅ SLA check completed. Overdue: ${results.overdueNotifications}, Warnings: ${results.warningNotifications}, Errors: ${results.errors.length}`);
    
  } catch (error) {
    const errorMsg = `Fatal error in SLA monitoring: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    results.errors.push(errorMsg);
  }

  return results;
}

/**
 * Get all active tasks that need SLA monitoring
 */
async function getActiveTasksWithSLA(): Promise<OverdueTask[]> {
  const tasks = await prisma.$queryRaw<OverdueTask[]>`
    SELECT 
      t.id,
      t.kode,
      t."projectId",
      t."moduleId", 
      t."pegawaiId",
      t."taskComplexity",
      t.status,
      t."assigneeStartTaskDeadline",
      t."assigneeWorkDeadline",
      t."pmReviewDeadline",
      t."scheduleAt",
      p."namaProyek" as "proyekNama",
      pm.nama as "moduleNama",
      pg."namaLengkap" as "pegawaiNama",
      pg."noHp" as "pegawaiPhone"
    FROM tasklist t
    JOIN proyek p ON t."projectId" = p.id
    JOIN proyek_module pm ON t."moduleId" = pm.id  
    JOIN pegawai pg ON t."pegawaiId" = pg.id
    WHERE t.status IN ('MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'MENUNGGU_REVIEW_PM')
      AND (
        t."assigneeStartTaskDeadline" IS NOT NULL OR 
        t."assigneeWorkDeadline" IS NOT NULL OR 
        t."pmReviewDeadline" IS NOT NULL
      )
    ORDER BY t."assigneeStartTaskDeadline" ASC
  `;
  
  return tasks;
}

/**
 * Check if a task needs SLA notification
 */
function checkTaskSLAStatus(task: OverdueTask, currentTime: Date): {
  shouldNotify: boolean;
  type: 'overdue' | 'warning' | 'none';
  deadline: Date | null;
  minutesDifference: number;
} {
  let relevantDeadline: Date | null = null;
  
  // Determine which deadline to check based on task status
  switch (task.status) {
    case 'MENUNGGU_PROSES_USER':
      relevantDeadline = task.assigneeStartTaskDeadline;
      break;
    case 'SEDANG_DIPROSES_USER':
      relevantDeadline = task.assigneeWorkDeadline;
      break;
    case 'MENUNGGU_REVIEW_PM':
      relevantDeadline = task.pmReviewDeadline;
      break;
  }
  
  if (!relevantDeadline) {
    return { shouldNotify: false, type: 'none', deadline: null, minutesDifference: 0 };
  }
  
  const deadlineTime = new Date(relevantDeadline).getTime();
  const currentTimeMs = currentTime.getTime();
  const minutesDifference = Math.floor((deadlineTime - currentTimeMs) / (1000 * 60));
  
  // Check if overdue (past deadline)
  if (minutesDifference < 0) {
    return {
      shouldNotify: true,
      type: 'overdue',
      deadline: relevantDeadline,
      minutesDifference: Math.abs(minutesDifference)
    };
  }
  
  // SLA warnings are disabled for now
  // Check if approaching deadline (warning - 30 minutes before)
  // if (minutesDifference <= 30 && minutesDifference > 0) {
  //   return {
  //     shouldNotify: true,
  //     type: 'warning',
  //     deadline: relevantDeadline,
  //     minutesDifference
  //   };
  // }
  
  return { shouldNotify: false, type: 'none', deadline: relevantDeadline, minutesDifference };
}

/**
 * Send SLA notification via WhatsApp
 */
async function sendSLANotification(
  task: OverdueTask, 
  slaStatus: { type: 'overdue' | 'warning'; deadline: Date | null; minutesDifference: number }
): Promise<{ messageId?: string } | null> {
  
  if (!task.pegawaiPhone) {
    console.warn(`No phone number for pegawai ${task.pegawaiNama} (ID: ${task.pegawaiId})`);
    return null;
  }
  
  // Check if we already sent a notification recently (avoid spam)
  const recentNotification = await checkRecentNotification(task.id, task.pegawaiId, slaStatus.type);
  if (recentNotification) {
    console.log(`Skipping notification for task ${task.kode} - already sent recently`);
    return null;
  }
  
  const cleanPhone = cleanPhoneNumber(task.pegawaiPhone);
  let message: string;
  
  if (slaStatus.type === 'overdue') {
    message = formatSLAOverdueMessage({
      id: task.id,
      kode: task.kode,
      proyekNama: task.proyekNama || 'Unknown Project',
      moduleNama: task.moduleNama || 'Unknown Module',
      pegawaiNama: task.pegawaiNama || 'Unknown User',
      taskComplexity: task.taskComplexity,
      assigneeStartTaskDeadline: slaStatus.deadline!,
      overdueMinutes: slaStatus.minutesDifference
    });
  } else {
    message = formatSLAWarningMessage({
      id: task.id,
      kode: task.kode,
      proyekNama: task.proyekNama || 'Unknown Project',
      moduleNama: task.moduleNama || 'Unknown Module', 
      pegawaiNama: task.pegawaiNama || 'Unknown User',
      taskComplexity: task.taskComplexity,
      assigneeStartTaskDeadline: slaStatus.deadline!,
      remainingMinutes: slaStatus.minutesDifference
    });
  }
  
  const result = await sendWhatsAppMessage({
    to: cleanPhone,
    message,
    taskId: task.id,
    notificationType: 'sla_overdue'
  });
  
  if (result.success) {
    console.log(`✅ SLA notification sent to ${task.pegawaiNama} for task ${task.kode}`);
    return { messageId: result.messageId };
  } else {
    console.error(`❌ Failed to send SLA notification: ${result.error}`);
    return null;
  }
}

/**
 * Check if we sent a notification recently to avoid spam
 */
async function checkRecentNotification(
  taskId: number, 
  pegawaiId: number, 
  type: 'overdue' | 'warning'
): Promise<boolean> {
  try {
    // Check if notification was sent in the last hour for warnings, 30 minutes for overdue
    const timeThreshold = type === 'warning' ? 60 : 30; // minutes
    const thresholdTime = new Date(Date.now() - timeThreshold * 60 * 1000);
    
    const recent = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM sla_notification_log 
      WHERE "taskId" = ${taskId} 
        AND "pegawaiId" = ${pegawaiId}
        AND "notificationType" = ${type}
        AND "sentAt" > ${thresholdTime}
    `;
    
    return (recent[0]?.count || 0) > 0;
  } catch (error) {
    // If table doesn't exist or query fails, allow notification
    console.warn('Could not check recent notifications:', error);
    return false;
  }
}

/**
 * Log notification to prevent spam
 */
async function logNotification(
  taskId: number,
  pegawaiId: number, 
  type: 'overdue' | 'warning',
  messageId?: string
): Promise<void> {
  try {
    // Create table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS sla_notification_log (
        id SERIAL PRIMARY KEY,
        "taskId" INT NOT NULL,
        "pegawaiId" INT NOT NULL,
        "notificationType" VARCHAR(20) NOT NULL,
        "sentAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "messageId" VARCHAR(255)
      )
    `);
    
    await prisma.$executeRaw`
      INSERT INTO sla_notification_log ("taskId", "pegawaiId", "notificationType", "sentAt", "messageId")
      VALUES (${taskId}, ${pegawaiId}, ${type}, NOW(), ${messageId || null})
    `;
  } catch (error) {
    console.error('Failed to log notification:', error);
  }
}
