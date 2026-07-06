/**
 * Task Validation Helper
 * Utilities for validating CRM tasks and working hours
 */

import { validateWorkingHours, isTimeWithinWorkingHours, getUserWorkingHours, isTimeWithinUserWorkingHours } from './richzspotService';

export interface TaskValidationInfo {
  idCrm?: string | null;
  scheduleAt: Date;
  customDurationHours?: number | null;
}

export interface WorkingHoursValidation {
  isValid: boolean;
  isWorkingHours: boolean;
  currentTime: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  message?: string;
}

/**
 * Check if a CRM task has been validated (schedule and duration set)
 */
export function isTaskCrmValidated(task: TaskValidationInfo): boolean {
  // Non-CRM tasks are always considered validated
  if (!task.idCrm) return true;
  
  const isDefaultSchedule = task.scheduleAt.getHours() === 0 && 
                            task.scheduleAt.getMinutes() === 0;
  const hasNoDuration = !task.customDurationHours || task.customDurationHours <= 0;
  
  return !isDefaultSchedule && !hasNoDuration;
}

/**
 * Get validation status details for a CRM task
 */
export function getTaskValidationStatus(task: TaskValidationInfo): {
  isValidated: boolean;
  needsSchedule: boolean;
  needsDuration: boolean;
  message?: string;
} {
  if (!task.idCrm) {
    return {
      isValidated: true,
      needsSchedule: false,
      needsDuration: false
    };
  }
  
  const isDefaultSchedule = task.scheduleAt.getHours() === 0 && 
                            task.scheduleAt.getMinutes() === 0;
  const hasNoDuration = !task.customDurationHours || task.customDurationHours <= 0;
  
  const isValidated = !isDefaultSchedule && !hasNoDuration;
  
  let message: string | undefined;
  if (!isValidated) {
    const missing: string[] = [];
    if (isDefaultSchedule) missing.push('jadwal');
    if (hasNoDuration) missing.push('durasi');
    message = `Task CRM belum divalidasi. Perlu set ${missing.join(' dan ')}.`;
  }
  
  return {
    isValidated,
    needsSchedule: isDefaultSchedule,
    needsDuration: hasNoDuration,
    message
  };
}

/**
 * Validate if current time is within working hours (from RichzSpot API)
 */
export async function validateCurrentWorkingHours(): Promise<WorkingHoursValidation> {
  try {
    const result = await validateWorkingHours();
    
    return {
      isValid: result.success,
      isWorkingHours: result.isWorkingHours,
      currentTime: result.currentTime,
      workingHoursStart: result.workingHoursStart,
      workingHoursEnd: result.workingHoursEnd,
      message: result.message
    };
  } catch (error) {
    console.error('Failed to validate working hours:', error);
    
    // Fallback
    const now = new Date();
    const hour = now.getHours();
    const isWorkingHours = hour >= 8 && hour < 17;
    
    return {
      isValid: false,
      isWorkingHours,
      currentTime: now.toISOString(),
      workingHoursStart: '08:00',
      workingHoursEnd: '17:00',
      message: 'Gagal terhubung ke RichzSpot API, menggunakan validasi fallback'
    };
  }
}

/**
 * Check if a specific time is within working hours
 */
export async function checkTimeWorkingHours(time: Date): Promise<boolean> {
  try {
    return await isTimeWithinWorkingHours(time);
  } catch (error) {
    console.error('Failed to check time working hours:', error);
    
    // Fallback
    const hour = time.getHours();
    return hour >= 8 && hour < 17;
  }
}

/**
 * Validate if current time is within user's working hours (based on shift)
 */
export async function validateCurrentUserWorkingHours(userId: string): Promise<WorkingHoursValidation> {
  try {
    const now = new Date();
    const workingHours = await getUserWorkingHours(userId, now);
    const isWorkingHours = await isTimeWithinUserWorkingHours(userId, now);
    
    // Format message with break time info
    let message = isWorkingHours 
      ? `Dalam jam kerja (${workingHours.shiftName})`
      : `Luar jam kerja (${workingHours.shiftName}: ${workingHours.startTime} - ${workingHours.endTime}`;
    
    if (workingHours.breakStartTime && workingHours.breakEndTime) {
      message += `, istirahat: ${workingHours.breakStartTime} - ${workingHours.breakEndTime}`;
    }
    
    if (!isWorkingHours) {
      message += ')';
    }
    
    return {
      isValid: true,
      isWorkingHours,
      currentTime: now.toISOString(),
      workingHoursStart: workingHours.startTime,
      workingHoursEnd: workingHours.endTime,
      message
    };
  } catch (error) {
    console.error('Failed to validate user working hours:', error);
    
    // Fallback
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();
    const totalMin = hour * 60 + min;
    
    // Default: 06:00-12:00, 13:00-17:00 (break 12:00-13:00)
    const isWorkingHours = (totalMin >= 360 && totalMin < 720) || (totalMin >= 780 && totalMin < 1020);
    
    return {
      isValid: false,
      isWorkingHours,
      currentTime: now.toISOString(),
      workingHoursStart: '06:00',
      workingHoursEnd: '17:00',
      message: `Gagal mengambil jadwal dari RichzSpot, menggunakan validasi fallback (06:00-12:00, 13:00-17:00, istirahat 12:00-13:00)`
    };
  }
}

/**
 * Check if a specific time is within user's working hours
 */
export async function checkUserTimeWorkingHours(userId: string, time: Date): Promise<boolean> {
  try {
    return await isTimeWithinUserWorkingHours(userId, time);
  } catch (error) {
    console.error('Failed to check user time working hours:', error);
    
    // Fallback
    const hour = time.getHours();
    return hour >= 8 && hour < 17;
  }
}

/**
 * Validate if user can perform an action (start, submit, resume, pause, stop, approve, reject, etc.)
 * Checks if current time is within working hours
 * 
 * NOTE: This validation is ONLY for task execution actions (start, submit, resume, pause, stop, complete, approve, reject, disposition)
 * Administrative actions (edit, delete, etc.) are NOT validated and can be done anytime by PM/SUPER_ADMIN
 * 
 * @param userId - User ID (Programmer, Admin, PM, or Super Admin)
 * @param action - Action name (start, submit, resume, pause, stop, approve, reject, disposition, etc.)
 * @returns Validation result with isAllowed flag and detailed message
 */
export async function validateProgrammerActionTime(
  userId: string,
  action: string
): Promise<{
  isAllowed: boolean;
  message: string;
  workingHours?: {
    start: string;
    end: string;
    current: string;
    breakStart?: string;
    breakEnd?: string;
  };
}> {
  try {
    const now = new Date();
    const workingHours = await getUserWorkingHours(userId, now);
    const isWithinWorkingHours = await isTimeWithinUserWorkingHours(userId, now);
    
    const currentTimeStr = now.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    const actionLabel = action.toLowerCase();
    
    if (!isWithinWorkingHours) {
      return {
        isAllowed: false,
        message: `Tidak dapat ${getActionIndonesian(actionLabel)} di luar jam kerja. Jam kerja: ${workingHours.startTime} - ${workingHours.endTime}${workingHours.breakStartTime ? ` (istirahat: ${workingHours.breakStartTime} - ${workingHours.breakEndTime})` : ''}. Waktu sekarang: ${currentTimeStr}`,
        workingHours: {
          start: workingHours.startTime,
          end: workingHours.endTime,
          current: currentTimeStr,
          breakStart: workingHours.breakStartTime,
          breakEnd: workingHours.breakEndTime
        }
      };
    }
    
    return {
      isAllowed: true,
      message: `${getActionIndonesian(actionLabel)} diizinkan. Dalam jam kerja (${workingHours.shiftName}: ${workingHours.startTime} - ${workingHours.endTime})`,
      workingHours: {
        start: workingHours.startTime,
        end: workingHours.endTime,
        current: currentTimeStr,
        breakStart: workingHours.breakStartTime,
        breakEnd: workingHours.breakEndTime
      }
    };
  } catch (error) {
    console.error(`Failed to validate action time for user ${userId}:`, error);
    
    // Kalau Jadwal API gagal (user tidak punya ssoUserId, atau API down),
    // IZINKAN action - jangan block user karena masalah teknis
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
    
    const actionLabel = action.toLowerCase();
    
    console.warn(`⚠️ [Working Hours] Allowing ${actionLabel} for user ${userId} - Jadwal API unavailable, skipping validation`);
    
    return {
      isAllowed: true,
      message: `${getActionIndonesian(actionLabel)} diizinkan (validasi jadwal tidak tersedia)`,
      workingHours: {
        start: '00:00',
        end: '23:59',
        current: currentTimeStr
      }
    };
  }
}

/**
 * Standardized working hours validation response helper
 * Returns a NextResponse with OUTSIDE_WORKING_HOURS error
 * 
 * Use this helper to ensure consistent error responses across all endpoints
 * 
 * @param validation - Result from validateProgrammerActionTime()
 * @returns NextResponse with 400 status and standardized error format
 */
export function createWorkingHoursErrorResponse(validation: {
  message: string;
  workingHours?: {
    start: string;
    end: string;
    current: string;
    breakStart?: string;
    breakEnd?: string;
  };
}) {
  return {
    error: 'OUTSIDE_WORKING_HOURS',
    message: validation.message,
    workingHours: validation.workingHours
  };
}

/**
 * Helper function to get Indonesian translation of action
 */
function getActionIndonesian(action: string): string {
  const actionMap: Record<string, string> = {
    'start': 'memulai task',
    'submit': 'submit task',
    'resume': 'melanjutkan task',
    'pause': 'pause task',
    'stop': 'menghentikan task',
    'complete': 'menyelesaikan task',
    'approve': 'approve task',
    'reject': 'reject task',
    'disposition': 'disposition task'
  };
  
  return actionMap[action] || `melakukan action ${action}`;
}
