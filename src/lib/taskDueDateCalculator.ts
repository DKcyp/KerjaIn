import { prisma } from '@/lib/prisma';
import { SlaType, TaskStatus } from '@prisma/client';
import { addWorkingHours, formatWorkingHours } from '@/lib/workingHoursCalculator';

/**
 * Calculate due date based on scheduled date and task complexity using working hours
 */
export async function calculateTaskDueDate(
  scheduleAt: Date,
  taskComplexity: SlaType
): Promise<Date | null> {
  try {
    // Get task complexity configuration with timeout
    const complexityPromise = prisma.taskComplexity.findUnique({
      where: { complexity: taskComplexity }
    });
    
    // Add 5 second timeout to database query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task complexity query timeout')), 5000);
    });
    
    const complexity = await Promise.race([complexityPromise, timeoutPromise]) as any;

    if (!complexity || !complexity.hours) {
      console.warn(`No hours found for task complexity: ${taskComplexity}`);
      return null;
    }

    // Calculate due date using working hours logic
    // This respects business hours: Mon-Fri 8AM-4PM (with 12-1PM lunch), Sat 8AM-12PM, Sun holiday
    const dueDate = addWorkingHours(scheduleAt, complexity.hours);

    console.log(`Task due date calculation: ${scheduleAt.toLocaleString()} + ${formatWorkingHours(complexity.hours)} = ${dueDate.toLocaleString()}`);

    return dueDate;
  } catch (error) {
    console.error('Error calculating task due date:', error);
    return null;
  }
}

/**
 * Update calculated due date for a specific task
 */
export async function updateTaskDueDate(taskId: number): Promise<boolean> {
  try {
    // Get task details
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId },
      select: {
        scheduleAt: true,
        taskComplexity: true
      }
    });

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return false;
    }

    // Calculate new due date
    const dueDate = await calculateTaskDueDate(task.scheduleAt, task.taskComplexity);

    if (!dueDate) {
      console.error(`Could not calculate due date for task: ${taskId}`);
      return false;
    }

    // Update the task
    await prisma.tasklist.update({
      where: { id: taskId },
      data: { calculatedDueDate: dueDate }
    });

    console.log(`Updated due date for task ${taskId}: ${dueDate.toISOString()}`);
    return true;
  } catch (error) {
    console.error('Error updating task due date:', error);
    return false;
  }
}

/**
 * Calculate and set due date when creating a new task
 */
export async function setTaskDueDateOnCreate(
  scheduleAt: Date,
  taskComplexity: SlaType
): Promise<Date | null> {
  const dueDate = await calculateTaskDueDate(scheduleAt, taskComplexity);
  return dueDate;
}

/**
 * Bulk update calculated due dates for all tasks without due dates
 */
export async function updateAllTaskDueDates(): Promise<number> {
  try {
    // Get all task complexity configurations
    const complexities = await prisma.taskComplexity.findMany();
    const complexityMap = new Map<SlaType, number>();
    
    complexities.forEach(c => {
      complexityMap.set(c.complexity, c.hours);
    });

    // Get all tasks that need due date calculation
    const tasks = await prisma.tasklist.findMany({
      where: {
        calculatedDueDate: null
      },
      select: {
        id: true,
        scheduleAt: true,
        taskComplexity: true,
        kode: true
      }
    });

    console.log(`Found ${tasks.length} tasks without calculated due dates`);

    let updatedCount = 0;
    for (const task of tasks) {
      const complexityHours = complexityMap.get(task.taskComplexity);
      
      if (complexityHours && task.scheduleAt) {
        // Use working hours calculation instead of simple hour addition
        const dueDate = addWorkingHours(task.scheduleAt, complexityHours);

        await prisma.tasklist.update({
          where: { id: task.id },
          data: { calculatedDueDate: dueDate }
        });

        console.log(`Updated task ${task.kode}: ${task.scheduleAt.toISOString()} + ${formatWorkingHours(complexityHours)} = ${dueDate.toISOString()}`);
        updatedCount++;
      } else {
        console.log(`Skipped task ${task.kode}: Missing complexity hours or schedule date`);
      }
    }

    console.log(`Bulk updated ${updatedCount} task due dates`);
    return updatedCount;
  } catch (error) {
    console.error('Error bulk updating task due dates:', error);
    return 0;
  }
}

/**
 * Get tasks with overdue calculated due dates
 */
export async function getOverdueTasks() {
  try {
    const now = new Date();
    
    const overdueTasks = await prisma.tasklist.findMany({
      where: {
        calculatedDueDate: {
          lt: now
        },
        status: {
          notIn: [TaskStatus.SELESAI] // Exclude completed tasks
        }
      },
      orderBy: {
        calculatedDueDate: 'asc'
      }
    });

    return overdueTasks;
  } catch (error) {
    console.error('Error getting overdue tasks:', error);
    return [];
  }
}

/**
 * Format due date for display
 */
export function formatDueDate(dueDate: Date | null): string {
  if (!dueDate) return '-';
  
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    // Overdue
    const overdueDays = Math.abs(diffDays);
    const overdueHours = Math.abs(diffHours % 24);
    
    if (overdueDays > 0) {
      return `Overdue ${overdueDays}d ${overdueHours}h`;
    } else {
      return `Overdue ${Math.abs(diffHours)}h`;
    }
  } else {
    // Due in future
    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      return `Due in ${diffDays}d ${remainingHours}h`;
    } else {
      return `Due in ${diffHours}h`;
    }
  }
}
