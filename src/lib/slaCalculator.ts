import { prisma } from '@/lib/prisma';

export type SlaType = 'EASY' | 'MEDIUM' | 'HARD';

export interface SlaDeadlines {
  assigneeStartTaskDeadline: Date;
  assigneeWorkDeadline: Date;
  pmReviewDeadline: Date;
}

/**
 * Calculate SLA deadlines based on task complexity and schedule date
 * @param taskComplexity - The complexity level of the task (EASY/MEDIUM/HARD)
 * @param scheduleAt - The scheduled start date of the task
 * @returns Promise<SlaDeadlines> - The calculated deadline dates
 */
export async function calculateSlaDeadlines(
  taskComplexity: SlaType,
  scheduleAt: Date
): Promise<SlaDeadlines> {
  try {
    // Get SLA configuration for the task complexity with timeout
    const slaConfigPromise = prisma.masterSla.findUnique({
      where: { slaType: taskComplexity }
    });
    
    // Add 5 second timeout to database query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SLA config query timeout')), 5000);
    });
    
    const slaConfig = await Promise.race([slaConfigPromise, timeoutPromise]) as any;

    if (!slaConfig) {
      // Fallback to default values if no SLA config found
      const defaultSla = getDefaultSlaValues(taskComplexity);
      return calculateDeadlinesFromMinutes(scheduleAt, defaultSla);
    }

    return calculateDeadlinesFromMinutes(scheduleAt, {
      assigneeStartTask: slaConfig.assigneeStartTask,
      assigneeWorkDuration: slaConfig.assigneeWorkDuration,
      pmReviewDuration: slaConfig.pmReviewDuration
    });
  } catch (error) {
    console.error('Error calculating SLA deadlines:', error);
    // Fallback to default values on error
    const defaultSla = getDefaultSlaValues(taskComplexity);
    return calculateDeadlinesFromMinutes(scheduleAt, defaultSla);
  }
}

/**
 * Calculate deadline dates from duration in minutes
 */
function calculateDeadlinesFromMinutes(
  scheduleAt: Date,
  sla: { assigneeStartTask: number; assigneeWorkDuration: number; pmReviewDuration: number }
): SlaDeadlines {
  const startDate = new Date(scheduleAt);
  
  // Calculate assignee start task deadline
  const assigneeStartTaskDeadline = new Date(startDate);
  assigneeStartTaskDeadline.setMinutes(assigneeStartTaskDeadline.getMinutes() + sla.assigneeStartTask);
  
  // Calculate assignee work completion deadline (start + start duration + work duration)
  const assigneeWorkDeadline = new Date(assigneeStartTaskDeadline);
  assigneeWorkDeadline.setMinutes(assigneeWorkDeadline.getMinutes() + sla.assigneeWorkDuration);
  
  // Calculate PM review completion deadline (work completion + review duration)
  const pmReviewDeadline = new Date(assigneeWorkDeadline);
  pmReviewDeadline.setMinutes(pmReviewDeadline.getMinutes() + sla.pmReviewDuration);
  
  return {
    assigneeStartTaskDeadline,
    assigneeWorkDeadline,
    pmReviewDeadline
  };
}

/**
 * Get default SLA values when no configuration is found
 */
function getDefaultSlaValues(taskComplexity: SlaType) {
  switch (taskComplexity) {
    case 'EASY':
      return {
        assigneeStartTask: 30,      // 30 minutes
        assigneeWorkDuration: 120,  // 2 hours
        pmReviewDuration: 60        // 1 hour
      };
    case 'MEDIUM':
      return {
        assigneeStartTask: 60,      // 1 hour
        assigneeWorkDuration: 480,  // 8 hours
        pmReviewDuration: 120       // 2 hours
      };
    case 'HARD':
      return {
        assigneeStartTask: 120,     // 2 hours
        assigneeWorkDuration: 1440, // 24 hours
        pmReviewDuration: 240       // 4 hours
      };
    default:
      return {
        assigneeStartTask: 60,      // Default to MEDIUM
        assigneeWorkDuration: 480,
        pmReviewDuration: 120
      };
  }
}

/**
 * Check if a task is overdue based on current status and SLA deadlines
 */
export function checkSlaStatus(
  task: {
    status: string;
    assigneeStartTaskDeadline?: Date | null;
    assigneeWorkDeadline?: Date | null;
    pmReviewDeadline?: Date | null;
  },
  currentTime: Date = new Date()
): {
  isOverdue: boolean;
  overdueType: 'start' | 'work' | 'review' | null;
  timeRemaining: number | null; // minutes remaining (negative if overdue)
} {
  const now = currentTime.getTime();
  
  switch (task.status) {
    case 'MENUNGGU_PROSES_USER':
      if (task.assigneeStartTaskDeadline) {
        const deadline = new Date(task.assigneeStartTaskDeadline).getTime();
        const timeRemaining = Math.floor((deadline - now) / (1000 * 60));
        return {
          isOverdue: now > deadline,
          overdueType: now > deadline ? 'start' : null,
          timeRemaining
        };
      }
      break;
      
    case 'SEDANG_DIPROSES_USER':
      if (task.assigneeWorkDeadline) {
        const deadline = new Date(task.assigneeWorkDeadline).getTime();
        const timeRemaining = Math.floor((deadline - now) / (1000 * 60));
        return {
          isOverdue: now > deadline,
          overdueType: now > deadline ? 'work' : null,
          timeRemaining
        };
      }
      break;
      
    case 'MENUNGGU_REVIEW_PM':
      if (task.pmReviewDeadline) {
        const deadline = new Date(task.pmReviewDeadline).getTime();
        const timeRemaining = Math.floor((deadline - now) / (1000 * 60));
        return {
          isOverdue: now > deadline,
          overdueType: now > deadline ? 'review' : null,
          timeRemaining
        };
      }
      break;
  }
  
  return {
    isOverdue: false,
    overdueType: null,
    timeRemaining: null
  };
}
