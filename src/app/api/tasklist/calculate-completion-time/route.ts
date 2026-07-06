/**
 * Calculate Completion Time Preview
 * POST /api/tasklist/calculate-completion-time
 * 
 * Used for UI preview before creating task
 * Shows when task will be completed based on:
 * - Start time (scheduleAt)
 * - Duration (customDurationHours or taskComplexity)
 * - Working hours (from JWT)
 * - Break time (from master_break_time)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateTaskSchedule } from '@/lib/smartScheduling';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const {
      pegawaiId,
      scheduleAt,
      customDurationHours,
      taskComplexity = 'MEDIUM'
    } = body;

    // Validate required fields
    if (!pegawaiId || !scheduleAt) {
      return NextResponse.json(
        { error: 'pegawaiId and scheduleAt are required' },
        { status: 400 }
      );
    }

    const startTime = new Date(scheduleAt);
    if (isNaN(startTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduleAt format' },
        { status: 400 }
      );
    }

    console.log(`📅 [Calculate Completion Time] Starting calculation`);
    console.log(`   User: ${pegawaiId}`);
    console.log(`   Start: ${startTime.toISOString()}`);
    console.log(`   Custom Duration: ${customDurationHours || 'none'}`);
    console.log(`   Complexity: ${taskComplexity}`);

    // Determine duration in minutes
    let durationMinutes = 0;
    let durationSource = '';

    if (customDurationHours) {
      durationMinutes = Math.round(customDurationHours * 60);
      durationSource = `Custom: ${customDurationHours} hours`;
      console.log(`   Duration source: Custom (${customDurationHours} hours)`);
    } else {
      // Fetch from TaskComplexity master table
      const complexityMaster = await prisma.taskComplexity.findUnique({
        where: { complexity: taskComplexity as any }
      });

      if (complexityMaster) {
        durationMinutes = Math.round(complexityMaster.hours * 60);
        durationSource = `Complexity: ${taskComplexity} (${complexityMaster.hours} hours)`;
        console.log(`   Duration source: Complexity ${taskComplexity} (${complexityMaster.hours} hours)`);
      } else {
        // Fallback to 8 hours
        durationMinutes = 8 * 60;
        durationSource = `Default: 8 hours (complexity not found)`;
        console.log(`   Duration source: Default (8 hours - complexity not found)`);
      }
    }

    // Check if Get Jadwal feature is enabled
    const { isGetJadwalEnabled } = await import('@/lib/richzspotService');
    const isJadwalEnabled = await isGetJadwalEnabled();

    console.log(`🔧 [Get Jadwal] Feature status: ${isJadwalEnabled ? 'ENABLED' : 'DISABLED'}`);

    let workingHoursInfo = null;
    let breakTimeInfo = null;

    if (isJadwalEnabled) {
      // Get working hours info from JWT only if feature is enabled
      const { getUserWorkingHours } = await import('@/lib/richzspotService');
      const { getUserBreakTime } = await import('@/lib/breakTimeService');
      
      console.log(`\n🔍 [Calculate Completion Time] Fetching working hours and break time...`);
      workingHoursInfo = await getUserWorkingHours(pegawaiId.toString(), startTime);
      breakTimeInfo = await getUserBreakTime(pegawaiId);

      console.log(`\n📊 [Calculate Completion Time] Data Retrieved:`);
      console.log(`   Working hours from JWT: ${workingHoursInfo.startTime} - ${workingHoursInfo.endTime}`);
      console.log(`   Shift type: ${workingHoursInfo.shiftType} (${workingHoursInfo.shiftName})`);
      console.log(`   Break time: ${breakTimeInfo ? `${breakTimeInfo.startTime} - ${breakTimeInfo.endTime}` : 'none'}`);
    } else {
      console.log(`\n⚠️ [Calculate Completion Time] Get Jadwal DISABLED - using default working hours`);
      console.log(`   Default working hours: 08:00 - 16:00`);
      console.log(`   Default break time: 12:00 - 13:00`);
    }

    console.log(`   Duration: ${durationMinutes} minutes (${(durationMinutes / 60).toFixed(1)} hours)`);
    console.log(`   Start time: ${startTime.toISOString()}`);
    console.log(`\n`);

    // Calculate schedule using smart scheduling
    console.log(`   Calculating schedule...`);
    const scheduleResult = await calculateTaskSchedule(
      pegawaiId,
      startTime,
      durationMinutes
    );

    const completionTime = scheduleResult.endTime;
    const workingDays = scheduleResult.workingDays;
    const breakTimeExcluded = scheduleResult.breakTimeExcluded;

    console.log(`✅ [Calculate Completion Time] Calculation complete`);
    console.log(`   Completion time: ${completionTime.toISOString()}`);
    console.log(`   Working days: ${workingDays}`);
    console.log(`   Break time excluded: ${breakTimeExcluded} minutes`);

    // Format response
    const response = {
      success: true,
      warning: scheduleResult.warning || null,
      data: {
        startTime: startTime.toISOString(),
        completionTime: completionTime.toISOString(),
        durationMinutes,
        durationHours: (durationMinutes / 60).toFixed(2),
        durationSource,
        workingDays,
        breakTimeExcluded,
        schedule: scheduleResult.schedule,
        // Human-readable format
        startTimeFormatted: startTime.toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        completionTimeFormatted: completionTime.toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        // Summary for UI display
        summary: {
          startDate: startTime.toLocaleDateString('id-ID'),
          startTime: startTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          completionDate: completionTime.toLocaleDateString('id-ID'),
          completionTime: completionTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          durationText: `${(durationMinutes / 60).toFixed(1)} jam`,
          workingDaysText: `${workingDays} hari kerja`,
          breakTimeText: `${breakTimeExcluded} menit istirahat`
        },
        // Debug info for verification
        debugInfo: isJadwalEnabled && workingHoursInfo ? {
          workingHours: {
            startTime: workingHoursInfo.startTime,
            endTime: workingHoursInfo.endTime,
            source: 'JWT (RichzSpot API)'
          },
          breakTime: breakTimeInfo ? {
            startTime: breakTimeInfo.startTime,
            endTime: breakTimeInfo.endTime,
            source: 'master_break_time table'
          } : null,
          calculationMethod: 'Smart Scheduling with JWT + Break Time'
        } : {
          workingHours: null,
          breakTime: null,
          calculationMethod: 'Default Working Hours (Get Jadwal Disabled)',
          note: 'Fitur Get Jadwal dari JWT dinonaktifkan - menggunakan jam kerja default'
        }
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [Calculate Completion Time] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
