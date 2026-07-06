/**
 * KPI Calculator Service
 * Menghitung KPI programmer dengan data jadwal dari Jadwal API
 */

import { getUserWorkingHours, getJadwalByRange } from '@/lib/richzspotService';
import { getUserBreakTime } from '@/lib/breakTimeService';

export interface UserScheduleInfo {
  totalWorkingHours: number; // Total jam kerja dalam periode
  totalWorkingDays: number; // Total hari kerja dalam periode
  averageHoursPerDay: number; // Rata-rata jam kerja per hari
  startTime: string; // Jam mulai kerja
  endTime: string; // Jam selesai kerja
  breakStartTime?: string; // Jam mulai istirahat
  breakEndTime?: string; // Jam selesai istirahat
  shiftType: string; // Tipe shift (pagi, siang, malam)
}

export interface KPIMetrics {
  pegawaiId: number;
  pegawaiName: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number; // %
  onTimeRate: number; // %
  productivity: number; // %
  totalEstimatedHours: number;
  totalActualHours: number;
  totalWorkingHours: number; // Dari RichzSpot
  utilizationRate: number; // Actual / Working Hours * 100
  avgCompletionTime: number; // hours
  overdueTasks: number;
  onTimeTasks: number;
}

/**
 * Get total working hours for a user in a date range
 * Mengambil data dari Jadwal API range endpoint (single call instead of per-day)
 */
export async function getUserTotalWorkingHours(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<UserScheduleInfo> {
  try {
    console.log(`📅 [KPI] Getting working hours for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Format dates for API call
    const startYear = startDate.getFullYear();
    const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const startDay = startDate.getDate().toString().padStart(2, '0');
    const endYear = endDate.getFullYear();
    const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
    const endDay = endDate.getDate().toString().padStart(2, '0');
    const tanggalAwal = `${startYear}-${startMonth}-${startDay}`;
    const tanggalAkhir = `${endYear}-${endMonth}-${endDay}`;

    let totalWorkingHours = 0;
    let totalWorkingDays = 0;
    let lastSchedule: any = null;

    // Get ssoUserId from database
    const { PrismaClient } = require('@prisma/client');
    const prismaKpi = new PrismaClient();
    const pegawaiForJadwal = await prismaKpi.pegawai.findUnique({
      where: { id: userId },
      select: { ssoUserId: true }
    });
    await prismaKpi.$disconnect();

    if (!pegawaiForJadwal?.ssoUserId) {
      console.warn(`⚠️ [KPI] Pegawai ${userId} has no ssoUserId - using fallback`);
      throw new Error(`User ${userId} not linked to RichzSpot`);
    }

    // Get all jadwal data in one API call using sso_user_id (no auth needed)
    const jadwalData = await getJadwalByRange(tanggalAwal, tanggalAkhir, { ssoUserId: pegawaiForJadwal.ssoUserId });

    // Get break time from master (once)
    const breakTime = await getUserBreakTime(userId);

    for (const item of jadwalData) {
      // Skip holidays (no shift times)
      if (!item.shift_jam_masuk || !item.shift_jam_pulang) {
        console.log(`   ⏭️ ${item.tanggal || 'unknown'}: Holiday or no schedule`);
        continue;
      }

      // Parse working hours
      const [startHour, startMin] = item.shift_jam_masuk.substring(0, 5).split(':').map(Number);
      const [endHour, endMin] = item.shift_jam_pulang.substring(0, 5).split(':').map(Number);
      
      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;
      
      let dayWorkingMinutes = endTotalMin - startTotalMin;
      
      // Subtract break time if exists
      if (breakTime) {
        const [breakStartHour, breakStartMin] = breakTime.startTime.split(':').map(Number);
        const [breakEndHour, breakEndMin] = breakTime.endTime.split(':').map(Number);
        
        const breakStartTotalMin = breakStartHour * 60 + breakStartMin;
        const breakEndTotalMin = breakEndHour * 60 + breakEndMin;
        
        const breakDurationMin = breakEndTotalMin - breakStartTotalMin;
        dayWorkingMinutes -= breakDurationMin;
      }
      
      totalWorkingHours += dayWorkingMinutes / 60;
      totalWorkingDays++;
      lastSchedule = {
        startTime: item.shift_jam_masuk.substring(0, 5),
        endTime: item.shift_jam_pulang.substring(0, 5),
        breakStartTime: breakTime?.startTime,
        breakEndTime: breakTime?.endTime,
        shiftType: item.shift_tipe || 'regular'
      };
      
      console.log(`   ✅ ${item.tanggal || 'unknown'}: ${(dayWorkingMinutes / 60).toFixed(2)} hours`);
    }

    const averageHoursPerDay = totalWorkingDays > 0 ? totalWorkingHours / totalWorkingDays : 0;

    const result: UserScheduleInfo = {
      totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
      totalWorkingDays,
      averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
      startTime: lastSchedule?.startTime || '08:00',
      endTime: lastSchedule?.endTime || '17:00',
      breakStartTime: lastSchedule?.breakStartTime,
      breakEndTime: lastSchedule?.breakEndTime,
      shiftType: lastSchedule?.shiftType || 'regular',
    };

    console.log(`✅ [KPI] Total working hours: ${result.totalWorkingHours} hours (${result.totalWorkingDays} days)`);
    return result;
  } catch (error) {
    console.error('❌ [KPI] Failed to get user working hours:', error);
    
    // Fallback: assume 8 hours per day, 5 days per week
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDiff = daysDiff / 7;
    const workingDays = Math.ceil(weeksDiff * 5); // 5 working days per week
    const totalWorkingHours = workingDays * 8;

    return {
      totalWorkingHours,
      totalWorkingDays: workingDays,
      averageHoursPerDay: 8,
      startTime: '08:00',
      endTime: '17:00',
      breakStartTime: '12:00',
      breakEndTime: '13:00',
      shiftType: 'regular',
    };
  }
}

/**
 * Calculate utilization rate
 * Utilization = (Actual Working Hours / Total Available Working Hours) * 100
 */
export function calculateUtilizationRate(
  actualHours: number,
  totalWorkingHours: number
): number {
  if (totalWorkingHours === 0) return 0;
  return Math.round((actualHours / totalWorkingHours) * 100);
}

/**
 * Calculate productivity score
 * Productivity = (Estimated Hours / Actual Hours) * 100
 * Score > 100 = lebih cepat dari estimasi (good)
 * Score = 100 = sesuai estimasi (perfect)
 * Score < 100 = lebih lambat dari estimasi (needs improvement)
 */
export function calculateProductivity(
  estimatedHours: number,
  actualHours: number
): number {
  if (actualHours === 0) return 0;
  return Math.round((estimatedHours / actualHours) * 100);
}

/**
 * Calculate completion rate
 * Completion Rate = (Completed Tasks / Total Tasks) * 100
 */
export function calculateCompletionRate(
  completedTasks: number,
  totalTasks: number
): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

/**
 * Calculate on-time rate
 * On-Time Rate = (On-Time Tasks / Completed Tasks) * 100
 */
export function calculateOnTimeRate(
  onTimeTasks: number,
  completedTasks: number
): number {
  if (completedTasks === 0) return 0;
  return Math.round((onTimeTasks / completedTasks) * 100);
}

/**
 * Calculate average completion time
 * Average = Total Actual Minutes / Completed Tasks / 60
 */
export function calculateAverageCompletionTime(
  totalActualMinutes: number,
  completedTasks: number
): number {
  if (completedTasks === 0) return 0;
  return Math.round((totalActualMinutes / completedTasks / 60) * 10) / 10;
}

/**
 * Get performance level based on metrics
 */
export function getPerformanceLevel(metrics: KPIMetrics): {
  level: 'excellent' | 'good' | 'average' | 'poor';
  score: number;
  description: string;
} {
  // Calculate weighted score
  const completionScore = metrics.completionRate * 0.3; // 30%
  const onTimeScore = metrics.onTimeRate * 0.3; // 30%
  const productivityScore = Math.min(metrics.productivity, 150) * 0.2; // 20% (capped at 150%)
  const utilizationScore = metrics.utilizationRate * 0.2; // 20%

  const totalScore = completionScore + onTimeScore + productivityScore + utilizationScore;

  let level: 'excellent' | 'good' | 'average' | 'poor';
  let description: string;

  if (totalScore >= 90) {
    level = 'excellent';
    description = 'Performa sangat baik, terus pertahankan';
  } else if (totalScore >= 75) {
    level = 'good';
    description = 'Performa baik, ada ruang untuk improvement';
  } else if (totalScore >= 60) {
    level = 'average';
    description = 'Performa cukup, perlu ditingkatkan';
  } else {
    level = 'poor';
    description = 'Performa kurang, perlu perbaikan segera';
  }

  return {
    level,
    score: Math.round(totalScore),
    description,
  };
}

/**
 * Format schedule info for display
 */
export function formatScheduleInfo(schedule: UserScheduleInfo): string {
  return `${schedule.startTime} - ${schedule.endTime}${
    schedule.breakStartTime ? ` (istirahat: ${schedule.breakStartTime} - ${schedule.breakEndTime})` : ''
  }`;
}
