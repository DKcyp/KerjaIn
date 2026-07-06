/**
 * Smart Scheduling Service
 * Automatically calculates task end time based on:
 * - User's working hours (from JWT/RichzSpot)
 * - Break time (from Master Break Time)
 * - Required duration
 */

import { getUserWorkingHours, isTimeWithinUserWorkingHours } from '@/lib/richzspotService';
import { getUserBreakTime } from '@/lib/breakTimeService';

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

export interface ScheduleCalculationResult {
  startTime: Date;
  endTime: Date;
  workingDays: number;
  breakTimeExcluded: number; // minutes
  actualWorkingMinutes: number;
  warning?: string; // Warning if no schedule found within 7 days
  schedule: Array<{
    date: string;
    startTime: string;
    endTime: string;
    workingMinutes: number;
  }>;
}

/**
 * Calculate task end time based on working hours and break time
 * Uses a day-by-day approach: for each day, query the actual working hours from RichzSpot,
 * skip holidays, and calculate how many minutes can be worked per day.
 */
export async function calculateTaskSchedule(
  userId: number,
  startTime: Date,
  durationMinutes: number
): Promise<ScheduleCalculationResult> {
  try {
    console.log(`📅 [SmartScheduling] Calculating schedule for user ${userId}`);
    console.log(`   Start: ${startTime.toISOString()}`);
    console.log(`   Duration: ${durationMinutes} minutes`);

    const breakTime = await getUserBreakTime(userId);

    let breakStartTotalMin = 0;
    let breakEndTotalMin = 0;
    if (breakTime) {
      const [bsh, bsm] = breakTime.startTime.split(':').map(Number);
      const [beh, bem] = breakTime.endTime.split(':').map(Number);
      breakStartTotalMin = bsh * 60 + bsm;
      breakEndTotalMin = beh * 60 + bem;
      console.log(`   Break time: ${breakTime.startTime} - ${breakTime.endTime} (${breakStartTotalMin} - ${breakEndTotalMin} minutes)`);
    }

    let remainingMinutes = durationMinutes;
    let totalBreakTimeExcluded = 0;
    const schedule: Array<{
      date: string;
      startTime: string;
      endTime: string;
      workingMinutes: number;
    }> = [];

    // Convert UTC time to local time using built-in methods
    // This handles all timezone conversions correctly
    const localYear = startTime.getFullYear();
    const localMonth = startTime.getMonth();
    const localDay = startTime.getDate();
    const localHour = startTime.getHours();
    const localMinute = startTime.getMinutes();
    
    // Current date we're processing (in local timezone)
    let currentDate = new Date(localYear, localMonth, localDay, 0, 0, 0, 0);
    
    const startTotalMinLocal = localHour * 60 + localMinute;

    // Helper function to format date as YYYY-MM-DD without timezone conversion
    const formatDateLocal = (date: Date): string => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    console.log(`   Start time UTC: ${startTime.toISOString()}`);
    console.log(`   Start time local: ${localYear}-${(localMonth+1).toString().padStart(2,'0')}-${localDay.toString().padStart(2,'0')} ${localHour.toString().padStart(2,'0')}:${localMinute.toString().padStart(2,'0')}`);
    console.log(`   Processing date: ${formatDateLocal(currentDate)}`);

    const MAX_DAYS = 60; // safety limit - enough for 20h task with short shifts
    let daysProcessed = 0;
    let consecutiveNoSchedule = 0; // Track consecutive days without schedule
    let scheduleWarning: string | undefined;

    while (remainingMinutes > 0 && daysProcessed < MAX_DAYS) {
      daysProcessed++;

      // Format date as YYYY-MM-DD (without timezone conversion)
      const dateStr = formatDateLocal(currentDate);

      // Get working hours for this specific date
      let dayHours;
      try {
        dayHours = await getUserWorkingHours(userId.toString(), currentDate);
        consecutiveNoSchedule = 0; // Reset counter when schedule found
      } catch (e) {
        // Use hardcoded fallback schedule
        const fallbackSchedule = getFallbackSchedule(currentDate);

        if (!fallbackSchedule) {
          // Day off (e.g., Sunday) - skip to next day
          console.log(`   ⏭️ Skipping ${dateStr} (day off)`);
          consecutiveNoSchedule++;

          // If 7 consecutive days without schedule, set warning
          if (consecutiveNoSchedule >= 7 && !scheduleWarning) {
            scheduleWarning = `Jadwal kerja tidak ditemukan selama 7 hari berturut-turut mulai dari ${formatDateLocal(new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000))}. Pastikan jadwal sudah diatur di RichzSpot.`;
            console.warn(`⚠️ [SmartScheduling] WARNING: No schedule found for 7 consecutive days`);
          }

          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }

        // Use fallback schedule
        dayHours = {
          startTime: fallbackSchedule.startTime,
          endTime: fallbackSchedule.endTime,
          shiftName: 'Fallback Schedule'
        };
        consecutiveNoSchedule = 0;
        console.log(`   📅 Using fallback schedule for ${dateStr}: ${dayHours.startTime} - ${dayHours.endTime}`);
      }

      const [wsh, wsm] = dayHours.startTime.split(':').map(Number);
      const [weh, wem] = dayHours.endTime.split(':').map(Number);
      const shiftStartMin = wsh * 60 + wsm;
      const shiftEndMin = weh * 60 + wem;

      // Determine actual start time for this day
      let effectiveStartMin: number;
      
      // First day: use the actual start time (in local)
      if (daysProcessed === 1) {
        effectiveStartMin = Math.max(startTotalMinLocal, shiftStartMin);
        console.log(`   📅 Day 1 - ${dateStr}: shift ${dayHours.startTime}-${dayHours.endTime}, start ${localHour.toString().padStart(2,'0')}:${localMinute.toString().padStart(2,'0')}, effective ${Math.floor(effectiveStartMin/60).toString().padStart(2,'0')}:${(effectiveStartMin%60).toString().padStart(2,'0')}`);
      } else {
        // Subsequent days: start from shift start
        effectiveStartMin = shiftStartMin;
        console.log(`   📅 Day ${daysProcessed} - ${dateStr}: shift ${dayHours.startTime}-${dayHours.endTime}, effective start ${Math.floor(effectiveStartMin/60)}:${(effectiveStartMin%60).toString().padStart(2, '0')}`);
      }

      // If we start after shift end, skip this day
      if (effectiveStartMin >= shiftEndMin) {
        console.log(`      ⏭️ Start time after shift end, skipping`);
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Calculate available working minutes for this day (excluding break)
      let workedMinutes = 0;
      let cursor = effectiveStartMin;
      let dayEndMin = effectiveStartMin;
      let breakMinutesSkipped = 0;

      // Check if break time overlaps with shift
      // If break starts before shift ends, we can only work until break starts
      let effectiveShiftEnd = shiftEndMin;
      if (breakTime && breakStartTotalMin < shiftEndMin && breakStartTotalMin > effectiveStartMin) {
        // Break starts during our working hours
        // Check if break ends before shift ends
        if (breakEndTotalMin < shiftEndMin) {
          // Break is fully within shift - we can work after break
          // Don't change effectiveShiftEnd
        } else {
          // Break extends beyond shift end - we can only work until break starts
          effectiveShiftEnd = breakStartTotalMin;
        }
      }

      while (cursor < shiftEndMin && remainingMinutes > 0) {
        // Skip break time
        if (breakTime && cursor >= breakStartTotalMin && cursor < breakEndTotalMin) {
          totalBreakTimeExcluded++;
          breakMinutesSkipped++;
          // Don't update dayEndMin during break - end time should reflect last worked minute
          cursor++;
          continue;
        }
        // Work this minute
        workedMinutes++;
        remainingMinutes--;
        dayEndMin = cursor + 1;
        cursor++;
      }

      if (workedMinutes > 0) {
        const fmt = (m: number) => `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;
        
        // Split schedule into segments if break time is in between
        if (breakTime && breakMinutesSkipped > 0 && effectiveStartMin < breakStartTotalMin && dayEndMin > breakEndTotalMin) {
          // Segment 1: before break
          const seg1Min = breakStartTotalMin - effectiveStartMin;
          schedule.push({ date: dateStr, startTime: fmt(effectiveStartMin), endTime: fmt(breakStartTotalMin), workingMinutes: seg1Min });
          // Segment 2: after break
          const seg2Min = workedMinutes - seg1Min;
          schedule.push({ date: dateStr, startTime: fmt(breakEndTotalMin), endTime: fmt(dayEndMin), workingMinutes: seg2Min });
          console.log(`      ✅ ${fmt(effectiveStartMin)}-${fmt(breakStartTotalMin)} (${seg1Min}m) | break | ${fmt(breakEndTotalMin)}-${fmt(dayEndMin)} (${seg2Min}m) | ${remainingMinutes}m left`);
        } else {
          schedule.push({ date: dateStr, startTime: fmt(effectiveStartMin), endTime: fmt(dayEndMin), workingMinutes: workedMinutes });
          console.log(`      ✅ ${fmt(effectiveStartMin)}-${fmt(dayEndMin)} = ${workedMinutes}m (${breakMinutesSkipped}m break, ${remainingMinutes}m left)`);
        }
      } else {
        console.log(`      ⚠️ No work done (all time was break or outside shift)`);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build end time from last schedule entry
    let endTime = new Date(startTime);
    if (schedule.length > 0) {
      const lastDay = schedule[schedule.length - 1];
      const [eh, em] = lastDay.endTime.split(':').map(Number);
      
      // Parse the date
      const [year, month, day] = lastDay.date.split('-').map(Number);
      
      // Create a date in local time (Date constructor uses local timezone)
      endTime = new Date(year, month - 1, day, eh, em, 0, 0);
    }

    const result: ScheduleCalculationResult = {
      startTime,
      endTime,
      workingDays: schedule.length,
      breakTimeExcluded: totalBreakTimeExcluded,
      actualWorkingMinutes: durationMinutes,
      warning: scheduleWarning || (remainingMinutes > 0 ? `Jadwal tidak mencukupi: masih tersisa ${remainingMinutes} menit (${(remainingMinutes/60).toFixed(1)} jam) yang belum terjadwal. Pastikan jadwal kerja sudah diatur dengan lengkap.` : undefined),
      schedule
    };

    console.log(`✅ [SmartScheduling] Schedule calculated:`);
    console.log(`   End time: ${endTime.toISOString()}`);
    console.log(`   Working days: ${schedule.length}`);
    console.log(`   Break time excluded: ${totalBreakTimeExcluded} minutes`);
    console.log(`   Schedule:`, schedule);

    return result;
  } catch (error) {
    console.error('❌ [SmartScheduling] Failed to calculate schedule:', error);
    throw error;
  }
}

/**
 * Validate if a task can be scheduled at the given time
 */
export async function validateTaskSchedule(
  userId: number,
  startTime: Date,
  durationMinutes: number
): Promise<{
  valid: boolean;
  message: string;
  schedule?: ScheduleCalculationResult;
}> {
  try {
    // Check if start time is within working hours
    const isWithinWorkingHours = await isTimeWithinUserWorkingHours(userId.toString(), startTime);
    
    if (!isWithinWorkingHours) {
      return {
        valid: false,
        message: `Start time ${startTime.toLocaleTimeString()} is outside working hours`
      };
    }

    // Calculate the schedule
    const schedule = await calculateTaskSchedule(userId, startTime, durationMinutes);

    return {
      valid: true,
      message: `Task can be scheduled from ${startTime.toISOString()} to ${schedule.endTime.toISOString()}`,
      schedule
    };
  } catch (error) {
    console.error('❌ [SmartScheduling] Validation failed:', error);
    return {
      valid: false,
      message: `Failed to validate schedule: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Format schedule result for display
 */
export function formatScheduleResult(result: ScheduleCalculationResult): string {
  let output = `Task Schedule:\n`;
  output += `Start: ${result.startTime.toISOString()}\n`;
  output += `End: ${result.endTime.toISOString()}\n`;
  output += `Duration: ${result.actualWorkingMinutes} minutes\n`;
  output += `Break time excluded: ${result.breakTimeExcluded} minutes\n`;
  output += `Working days: ${result.workingDays}\n\n`;
  output += `Daily breakdown:\n`;

  result.schedule.forEach((day, index) => {
    output += `Day ${index + 1} (${day.date}): ${day.startTime} - ${day.endTime} (${day.workingMinutes} min)\n`;
  });

  return output;
}
