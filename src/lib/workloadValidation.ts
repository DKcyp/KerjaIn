/**
 * Workload Validation Service
 * Validates if a user has enough available working hours to accommodate a new task
 */

import { prisma } from '@/lib/prisma';
import { getUserBreakTime } from '@/lib/breakTimeService';
import { getUserWorkingHours } from '@/lib/richzspotService';

export interface WorkloadValidationResult {
  valid: boolean;
  message: string;
  details?: {
    existingTaskCodes: string[];
    totalScheduledHours: number;
    newTaskHours: number;
    availableHours: number;
    capacityThreshold: number;
    utilizationPercentage: number;
  };
}

interface DaySchedule {
  date: Date;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  availableMinutes: number;
  breakStartTime?: string;
  breakEndTime?: string;
  breakMinutes?: number;
}

/**
 * Hardcoded fallback schedule
 * Monday-Friday: 08:00 - 16:00 (8 hours)
 * Saturday: 07:30 - 10:30 (3 hours)
 * Sunday: off
 */
function getFallbackSchedule(date: Date): { startTime: string; endTime: string } | null {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (dayOfWeek === 0) {
    // Sunday - off
    return null;
  } else if (dayOfWeek === 6) {
    // Saturday
    return { startTime: '07:30', endTime: '10:30' };
  } else {
    // Monday-Friday
    return { startTime: '08:00', endTime: '16:00' };
  }
}

/**
 * Calculate available working minutes for a date range
 * Uses RichzSpot API with fallback to hardcoded schedule
 */
async function calculateAvailableMinutes(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<DaySchedule[]> {
  const schedules: DaySchedule[] = [];

  // Get break time from master
  const breakTime = await getUserBreakTime(userId);
  const breakStartMin = breakTime ? parseTimeToMinutes(breakTime.startTime) : null;
  const breakEndMin = breakTime ? parseTimeToMinutes(breakTime.endTime) : null;
  const breakDurationMin = breakStartMin !== null && breakEndMin !== null
    ? breakEndMin - breakStartMin
    : 0;

  console.log(`📊 [WorkloadValidation] Break time: ${breakTime?.startTime || 'none'} - ${breakTime?.endTime || 'none'} (${breakDurationMin} min)`);

  // Iterate through each day in the range
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const endDateOnly = new Date(endDate);
  endDateOnly.setHours(23, 59, 59, 999);

  while (currentDate <= endDateOnly) {
    let daySchedule: { startTime: string; endTime: string } | null = null;

    // Try to get from RichzSpot API first
    try {
      const workingHours = await getUserWorkingHours(userId.toString(), currentDate);
      daySchedule = {
        startTime: workingHours.startTime,
        endTime: workingHours.endTime
      };
      console.log(`📅 [WorkloadValidation] ${formatDate(currentDate)}: RichzSpot schedule ${daySchedule.startTime} - ${daySchedule.endTime}`);
    } catch (error) {
      // Fallback to hardcoded schedule
      daySchedule = getFallbackSchedule(currentDate);
      if (daySchedule) {
        console.log(`📅 [WorkloadValidation] ${formatDate(currentDate)}: Fallback schedule ${daySchedule.startTime} - ${daySchedule.endTime}`);
      } else {
        console.log(`📅 [WorkloadValidation] ${formatDate(currentDate)}: Day off`);
      }
    }

    if (daySchedule) {
      const startMin = parseTimeToMinutes(daySchedule.startTime);
      const endMin = parseTimeToMinutes(daySchedule.endTime);
      let availableMin = endMin - startMin;

      // Subtract break time if it falls within working hours
      if (breakStartMin !== null && breakEndMin !== null) {
        if (breakStartMin >= startMin && breakEndMin <= endMin) {
          // Break is fully within working hours
          availableMin -= breakDurationMin;
        } else if (breakStartMin < endMin && breakEndMin > startMin) {
          // Break partially overlaps
          const overlapStart = Math.max(breakStartMin, startMin);
          const overlapEnd = Math.min(breakEndMin, endMin);
          availableMin -= (overlapEnd - overlapStart);
        }
      }

      schedules.push({
        date: new Date(currentDate),
        startTime: daySchedule.startTime,
        endTime: daySchedule.endTime,
        availableMinutes: availableMin,
        breakStartTime: breakTime?.startTime,
        breakEndTime: breakTime?.endTime,
        breakMinutes: breakDurationMin
      });
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return schedules;
}

/**
 * Calculate total scheduled minutes for existing tasks in date range
 */
async function calculateScheduledMinutes(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<{ totalMinutes: number; tasks: Array<{ kode: string; durationMinutes: number }> }> {
  // Get existing tasks that overlap with the date range
  const existingTasks = await prisma.tasklist.findMany({
    where: {
      pegawaiId: userId,
      status: {
        in: ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED']
      },
      OR: [
        {
          // Task starts within range
          scheduleAt: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          // Task ends within range
          calculatedDueDate: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          // Task spans the entire range
          AND: [
            { scheduleAt: { lte: startDate } },
            { calculatedDueDate: { gte: endDate } }
          ]
        }
      ]
    },
    select: {
      id: true,
      kode: true,
      scheduleAt: true,
      calculatedDueDate: true,
      customDurationHours: true,
      taskComplexity: true
    }
  });

  let totalMinutes = 0;
  const taskDetails: Array<{ kode: string; durationMinutes: number }> = [];

  for (const task of existingTasks) {
    let durationMinutes = 0;

    if (task.customDurationHours) {
      durationMinutes = Math.round(task.customDurationHours * 60);
    } else {
      // Get duration from TaskComplexity master
      const complexity = await prisma.taskComplexity.findUnique({
        where: { complexity: task.taskComplexity }
      });
      durationMinutes = complexity ? Math.round(complexity.hours * 60) : 480; // Default 8 hours
    }

    totalMinutes += durationMinutes;
    taskDetails.push({
      kode: task.kode || `Task #${task.id}`,
      durationMinutes
    });
  }

  return { totalMinutes, tasks: taskDetails };
}

/**
 * Validate if a user has enough available working hours for a new task
 * @param userId - User ID to validate
 * @param startDate - Task start date
 * @param durationMinutes - Task duration in minutes
 * @param capacityThresholdPercent - Maximum capacity utilization (default 100%)
 */
export async function validateWorkload(
  userId: number,
  startDate: Date,
  durationMinutes: number,
  capacityThresholdPercent: number = 100
): Promise<WorkloadValidationResult> {
  try {
    console.log(`🔍 [WorkloadValidation] Validating workload for user ${userId}`);
    console.log(`   Start: ${startDate.toISOString()}`);
    console.log(`   Duration: ${durationMinutes} minutes (${(durationMinutes / 60).toFixed(1)} hours)`);
    console.log(`   Capacity threshold: ${capacityThresholdPercent}%`);

    // Estimate end date (rough calculation for query range)
    // Assume average 6 working hours per day
    const estimatedDays = Math.ceil(durationMinutes / (6 * 60));
    const estimatedEndDate = new Date(startDate);
    estimatedEndDate.setDate(estimatedEndDate.getDate() + estimatedDays + 7); // Add buffer

    // Calculate available minutes in the date range
    const daySchedules = await calculateAvailableMinutes(userId, startDate, estimatedEndDate);
    const totalAvailableMinutes = daySchedules.reduce((sum, day) => sum + day.availableMinutes, 0);

    console.log(`   Available minutes in range: ${totalAvailableMinutes} (${(totalAvailableMinutes / 60).toFixed(1)} hours over ${daySchedules.length} working days)`);

    // Calculate already scheduled minutes
    const { totalMinutes: scheduledMinutes, tasks: existingTasks } = await calculateScheduledMinutes(
      userId,
      startDate,
      estimatedEndDate
    );

    console.log(`   Already scheduled: ${scheduledMinutes} minutes (${(scheduledMinutes / 60).toFixed(1)} hours)`);
    console.log(`   Existing tasks: ${existingTasks.map(t => `${t.kode} (${(t.durationMinutes / 60).toFixed(1)}h)`).join(', ')}`);

    // Calculate new total
    const newTotalMinutes = scheduledMinutes + durationMinutes;
    const capacityThresholdMinutes = totalAvailableMinutes * (capacityThresholdPercent / 100);
    const utilizationPercentage = (newTotalMinutes / totalAvailableMinutes) * 100;

    console.log(`   New total: ${newTotalMinutes} minutes (${(newTotalMinutes / 60).toFixed(1)} hours)`);
    console.log(`   Capacity threshold: ${capacityThresholdMinutes} minutes (${(capacityThresholdMinutes / 60).toFixed(1)} hours)`);
    console.log(`   Utilization: ${utilizationPercentage.toFixed(1)}%`);

    // Check if exceeds capacity
    if (newTotalMinutes > capacityThresholdMinutes) {
      const excessMinutes = newTotalMinutes - capacityThresholdMinutes;
      return {
        valid: false,
        message: `User sudah memiliki ${(scheduledMinutes / 60).toFixed(1)} jam task. Menambahkan ${(durationMinutes / 60).toFixed(1)} jam akan melebihi kapasitas ${capacityThresholdPercent}% (${(capacityThresholdMinutes / 60).toFixed(1)} jam). Kelebihan: ${(excessMinutes / 60).toFixed(1)} jam.`,
        details: {
          existingTaskCodes: existingTasks.map(t => t.kode),
          totalScheduledHours: scheduledMinutes / 60,
          newTaskHours: durationMinutes / 60,
          availableHours: totalAvailableMinutes / 60,
          capacityThreshold: capacityThresholdMinutes / 60,
          utilizationPercentage
        }
      };
    }

    // Validation passed
    return {
      valid: true,
      message: `Workload valid. Utilization: ${utilizationPercentage.toFixed(1)}% (${(newTotalMinutes / 60).toFixed(1)}h / ${(totalAvailableMinutes / 60).toFixed(1)}h)`,
      details: {
        existingTaskCodes: existingTasks.map(t => t.kode),
        totalScheduledHours: scheduledMinutes / 60,
        newTaskHours: durationMinutes / 60,
        availableHours: totalAvailableMinutes / 60,
        capacityThreshold: capacityThresholdMinutes / 60,
        utilizationPercentage
      }
    };
  } catch (error) {
    console.error('❌ [WorkloadValidation] Validation failed:', error);

    // On error, allow the task (don't block due to validation failure)
    return {
      valid: true,
      message: `Workload validation skipped due to error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Helper: Parse time string (HH:mm) to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper: Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
