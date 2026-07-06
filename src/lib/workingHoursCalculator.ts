/**
 * Working Hours Calculator
 * Handles business hours calculation for task due dates
 *
 * Working Hours:
 * - Monday-Friday: 08:00 - 16:00 (8 hours) with 12:00 - 13:00 lunch break (7 working hours)
 * - Saturday: 07:30 - 10:30 (3 working hours)
 * - Sunday: Holiday (0 working hours)
 */

export interface WorkingHoursConfig {
  // Monday = 1, Tuesday = 2, ..., Sunday = 0
  weekdayStartHour: number;       // 8
  weekdayStartMinute: number;     // 0
  weekdayEndHour: number;         // 16
  weekdayEndMinute: number;       // 0
  weekdayLunchStartHour: number;  // 12
  weekdayLunchStartMinute: number;// 0
  weekdayLunchEndHour: number;    // 13
  weekdayLunchEndMinute: number;  // 0
  saturdayStartHour: number;      // 7
  saturdayStartMinute: number;    // 30
  saturdayEndHour: number;        // 10
  saturdayEndMinute: number;      // 30
  sundayIsHoliday: boolean;       // true
}

export const DEFAULT_CONFIG: WorkingHoursConfig = {
  weekdayStartHour: 8,        // 08:00
  weekdayStartMinute: 0,
  weekdayEndHour: 16,         // 16:00
  weekdayEndMinute: 0,
  weekdayLunchStartHour: 12,  // 12:00
  weekdayLunchStartMinute: 0,
  weekdayLunchEndHour: 13,    // 13:00
  weekdayLunchEndMinute: 0,
  saturdayStartHour: 7,       // 07:30
  saturdayStartMinute: 30,
  saturdayEndHour: 10,        // 10:30
  saturdayEndMinute: 30,
  sundayIsHoliday: true,
};

// ---------------------------------------------------------------------------
// Internal helpers — work in total minutes since midnight
// ---------------------------------------------------------------------------

function toTotalMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

function saturdayStartMin(config: WorkingHoursConfig): number {
  return toTotalMinutes(config.saturdayStartHour, config.saturdayStartMinute);
}
function saturdayEndMin(config: WorkingHoursConfig): number {
  return toTotalMinutes(config.saturdayEndHour, config.saturdayEndMinute);
}
function weekdayStartMin(config: WorkingHoursConfig): number {
  return toTotalMinutes(config.weekdayStartHour, config.weekdayStartMinute);
}
function weekdayEndMin(config: WorkingHoursConfig): number {
  return toTotalMinutes(config.weekdayEndHour, config.weekdayEndMinute);
}
function lunchStartMin(config: WorkingHoursConfig): number {
  return toTotalMinutes(config.weekdayLunchStartHour, config.weekdayLunchStartMinute);
}
function lunchEndMin(config: WorkingHoursConfig): number {
  return toTotalMinutes(config.weekdayLunchEndHour, config.weekdayLunchEndMinute);
}

/** Total minutes in day for the given date, considering this config */
function dayTotalMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Set a Date to a specific hour:minute (mutates) */
function setHM(date: Date, hour: number, minute: number): void {
  date.setHours(hour, minute, 0, 0);
}

// ---------------------------------------------------------------------------

/**
 * Get working hours (in fractional hours) for a specific day of the week.
 */
export function getWorkingHoursForDay(
  dayOfWeek: number,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): number {
  if (dayOfWeek === 0 && config.sundayIsHoliday) return 0;

  if (dayOfWeek === 6) {
    return (saturdayEndMin(config) - saturdayStartMin(config)) / 60; // 3 hours
  }

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    const totalMin = weekdayEndMin(config) - weekdayStartMin(config);       // 480 min
    const lunchMin = lunchEndMin(config) - lunchStartMin(config);           // 60 min
    return (totalMin - lunchMin) / 60;                                       // 7 hours
  }

  return 0;
}

/**
 * Check if a specific time is within working hours.
 */
export function isWithinWorkingHours(
  date: Date,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): boolean {
  const dayOfWeek = date.getDay();
  const totalMin = dayTotalMinutes(date);

  if (dayOfWeek === 0 && config.sundayIsHoliday) return false;

  if (dayOfWeek === 6) {
    return totalMin >= saturdayStartMin(config) && totalMin < saturdayEndMin(config);
  }

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    if (totalMin < weekdayStartMin(config) || totalMin >= weekdayEndMin(config)) return false;
    if (totalMin >= lunchStartMin(config) && totalMin < lunchEndMin(config)) return false;
    return true;
  }

  return false;
}

/**
 * Get the next working-hour start time from a given date.
 * If the date is already inside working hours it is returned unchanged.
 */
export function getNextWorkingHourStart(
  date: Date,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): Date {
  const result = new Date(date);

  while (true) {
    const dayOfWeek = result.getDay();
    const totalMin = dayTotalMinutes(result);

    if (dayOfWeek === 0 && config.sundayIsHoliday) {
      // Sunday → Monday start
      result.setDate(result.getDate() + 1);
      setHM(result, config.weekdayStartHour, config.weekdayStartMinute);
      continue;
    }

    if (dayOfWeek === 6) {
      const satStart = saturdayStartMin(config);
      const satEnd   = saturdayEndMin(config);

      if (totalMin < satStart) {
        setHM(result, config.saturdayStartHour, config.saturdayStartMinute);
        return result;
      } else if (totalMin >= satEnd) {
        // After Saturday end → Monday
        result.setDate(result.getDate() + 2);
        setHM(result, config.weekdayStartHour, config.weekdayStartMinute);
        return result;
      } else {
        return result; // Already inside Saturday working hours
      }
    }

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const wdStart  = weekdayStartMin(config);
      const wdEnd    = weekdayEndMin(config);
      const lsStart  = lunchStartMin(config);
      const lsEnd    = lunchEndMin(config);

      if (totalMin < wdStart) {
        setHM(result, config.weekdayStartHour, config.weekdayStartMinute);
        return result;
      } else if (totalMin >= lsStart && totalMin < lsEnd) {
        // During lunch → jump to lunch end
        setHM(result, config.weekdayLunchEndHour, config.weekdayLunchEndMinute);
        return result;
      } else if (totalMin >= wdEnd) {
        // After end of day → next working day
        result.setDate(result.getDate() + 1);
        const nextDay = result.getDay();
        if (nextDay === 6) {
          setHM(result, config.saturdayStartHour, config.saturdayStartMinute);
        } else if (nextDay === 0) {
          result.setDate(result.getDate() + 1);
          setHM(result, config.weekdayStartHour, config.weekdayStartMinute);
        } else {
          setHM(result, config.weekdayStartHour, config.weekdayStartMinute);
        }
        continue;
      } else {
        return result; // Already inside working hours
      }
    }

    // Fallback
    result.setDate(result.getDate() + 1);
    const nextDay = result.getDay();
    if (nextDay === 6) {
      setHM(result, config.saturdayStartHour, config.saturdayStartMinute);
    } else if (nextDay === 0) {
      result.setDate(result.getDate() + 1);
      setHM(result, config.weekdayStartHour, config.weekdayStartMinute);
    } else {
      setHM(result, config.weekdayStartHour, config.weekdayStartMinute);
    }
  }
}

/**
 * Calculate working hours between two dates.
 */
export function calculateWorkingHoursBetween(
  startDate: Date,
  endDate: Date,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): number {
  if (startDate >= endDate) return 0;

  let totalHours = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    const dayOfWeek = current.getDay();
    const workingHoursInDay = getWorkingHoursForDay(dayOfWeek, config);

    if (workingHoursInDay > 0) {
      const dayStart = new Date(current);
      if (dayOfWeek === 6) {
        setHM(dayStart, config.saturdayStartHour, config.saturdayStartMinute);
      } else {
        setHM(dayStart, config.weekdayStartHour, config.weekdayStartMinute);
      }

      const dayEnd = new Date(current);
      if (dayOfWeek === 6) {
        setHM(dayEnd, config.saturdayEndHour, config.saturdayEndMinute);
      } else {
        setHM(dayEnd, config.weekdayEndHour, config.weekdayEndMinute);
      }

      const effectiveStart = new Date(Math.max(current.getTime(), dayStart.getTime()));
      const effectiveEnd   = new Date(Math.min(endDate.getTime(), dayEnd.getTime()));

      if (effectiveStart < effectiveEnd) {
        let hoursInDay =
          (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);

        // Subtract lunch break overlap (weekdays only)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const lunch1 = new Date(current);
          setHM(lunch1, config.weekdayLunchStartHour, config.weekdayLunchStartMinute);
          const lunch2 = new Date(current);
          setHM(lunch2, config.weekdayLunchEndHour, config.weekdayLunchEndMinute);

          if (effectiveStart < lunch2 && effectiveEnd > lunch1) {
            const overlapStart = new Date(Math.max(effectiveStart.getTime(), lunch1.getTime()));
            const overlapEnd   = new Date(Math.min(effectiveEnd.getTime(), lunch2.getTime()));
            hoursInDay -=
              (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
          }
        }

        totalHours += Math.max(0, hoursInDay);
      }
    }

    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return totalHours;
}

/**
 * Add working hours to a date, respecting business hours and lunch breaks.
 */
export function addWorkingHours(
  startDate: Date,
  hoursToAdd: number,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): Date {
  if (hoursToAdd <= 0) return new Date(startDate);

  let remainingHours = hoursToAdd;
  let current = getNextWorkingHourStart(startDate, config);
  let iterationCount = 0;
  const maxIterations = 365;

  while (remainingHours > 0 && iterationCount < maxIterations) {
    iterationCount++;
    const dayOfWeek = current.getDay();
    const workingHoursInDay = getWorkingHoursForDay(dayOfWeek, config);

    if (workingHoursInDay > 0) {
      const dayEnd = new Date(current);
      if (dayOfWeek === 6) {
        setHM(dayEnd, config.saturdayEndHour, config.saturdayEndMinute);
      } else {
        setHM(dayEnd, config.weekdayEndHour, config.weekdayEndMinute);
      }

      // Clamp current to day start if before it
      const dayStart = new Date(current);
      if (dayOfWeek === 6) {
        setHM(dayStart, config.saturdayStartHour, config.saturdayStartMinute);
      } else {
        setHM(dayStart, config.weekdayStartHour, config.weekdayStartMinute);
      }
      const workStart = new Date(Math.max(current.getTime(), dayStart.getTime()));

      // Calculate available working minutes today (excluding lunch)
      let availableHours = (dayEnd.getTime() - workStart.getTime()) / (1000 * 60 * 60);

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const lunch1 = new Date(current);
        setHM(lunch1, config.weekdayLunchStartHour, config.weekdayLunchStartMinute);
        const lunch2 = new Date(current);
        setHM(lunch2, config.weekdayLunchEndHour, config.weekdayLunchEndMinute);

        if (workStart < lunch2 && dayEnd > lunch1) {
          const overlapStart = new Date(Math.max(workStart.getTime(), lunch1.getTime()));
          const overlapEnd   = new Date(Math.min(dayEnd.getTime(), lunch2.getTime()));
          availableHours -=
            (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
        }
      }

      availableHours = Math.max(0, availableHours);

      if (remainingHours <= availableHours) {
        // Finish today — add milliseconds and skip over lunch if crossed
        let finalTime = new Date(
          workStart.getTime() + remainingHours * 60 * 60 * 1000
        );

        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const lunch1 = new Date(current);
          setHM(lunch1, config.weekdayLunchStartHour, config.weekdayLunchStartMinute);
          const lunch2 = new Date(current);
          setHM(lunch2, config.weekdayLunchEndHour, config.weekdayLunchEndMinute);

          if (workStart < lunch1 && finalTime > lunch1) {
            // Crossed lunch — push end time by lunch duration
            const lunchDurationMs =
              lunch2.getTime() - lunch1.getTime();
            finalTime = new Date(finalTime.getTime() + lunchDurationMs);
          }
        }

        // Cap at shift end — should never happen but safety net
        if (finalTime > dayEnd) finalTime = new Date(dayEnd);

        return finalTime;
      } else {
        remainingHours -= availableHours;
      }
    }

    // Move to next working day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
    current = getNextWorkingHourStart(current, config);
  }

  if (iterationCount >= maxIterations) {
    console.error(
      '⚠️ Working hours calculation exceeded maximum iterations, returning fallback date'
    );
    return new Date(startDate.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  return current;
}

/**
 * Format working hours for display.
 */
export function formatWorkingHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} menit`;
  }

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) return `${wholeHours} jam`;
  return `${wholeHours} jam ${minutes} menit`;
}
