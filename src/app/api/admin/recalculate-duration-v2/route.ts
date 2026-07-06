import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

interface DurationCalculation {
  taskId: number;
  taskCode: string;
  oldDuration: number;
  newDuration: number;
  difference: number;
  status: string;
  breakdown: {
    startToKirimDuration: number;   // START → KIRIM (work duration)
    kirimToApproveDuration: number; // KIRIM → APPROVE (review duration)
    rejectCount: number;            // Berapa kali di-reject
    isApproved: boolean;            // Apakah final state APPROVED
  };
}

interface DurationResult {
  total: number;
  breakdown: {
    startToKirimDuration: number;   // START → KIRIM (work duration)
    kirimToApproveDuration: number; // KIRIM → APPROVE (review duration)
    rejectCount: number;            // Berapa kali di-reject
    isApproved: boolean;            // Apakah final state APPROVED
  };
}

/**
 * Calculate total duration in minutes based on tasklist_log entries
 * 
 * Logic:
 * 1. Work Duration = START → KIRIM (time spent working)
 * 2. Review Duration = KIRIM → APPROVE/REJECT (time spent in review)
 * 3. Support multiple cycles with REJECT
 * 4. EDIT events are skipped (they only change metadata)
 * 5. Total = work duration + review duration
 */
async function calculateTaskDuration(taskId: number): Promise<DurationResult> {
  const logs = await prisma.tasklistLog.findMany({
    where: { taskId },
    orderBy: { waktu: 'asc' }
  });

  if (logs.length === 0) {
    return {
      total: 0,
      breakdown: {
        startToKirimDuration: 0,
        kirimToApproveDuration: 0,
        rejectCount: 0,
        isApproved: false
      }
    };
  }

  let totalWorkDuration = 0;      // Σ(START → STOP) before KIRIM
  let totalReviewDuration = 0;    // KIRIM → APPROVE/REJECT
  let rejectCount = 0;
  let isApproved = false;

  let lastStartTime: Date | null = null;
  let lastKirimTime: Date | null = null;

  // Helper function to detect event type
  const getEventType = (action: string, keterangan: string, status: string): string => {
    const actionLower = action?.toLowerCase() || '';
    const keteranganLower = keterangan?.toLowerCase() || '';
    const statusLower = status?.toLowerCase() || '';
    const fullText = `${actionLower} ${keteranganLower} ${statusLower}`.toLowerCase();

    // EDIT events - skip these
    if (
      actionLower === 'update' ||
      fullText.includes('durasi custom') ||
      fullText.includes('kompleksitas') ||
      fullText.includes('due date') ||
      fullText.includes('alasan edit') ||
      (fullText.includes('edit') && !fullText.includes('task started') && !fullText.includes('task stopped'))
    ) {
      return 'EDIT';
    }

    // START events
    if (
      actionLower.includes('start') ||
      fullText.includes('task started') ||
      fullText.includes('dimulai')
    ) {
      return 'START';
    }

    // STOP/PAUSE events
    if (
      actionLower === 'stop' ||
      actionLower === 'pause' ||
      keteranganLower.includes('dihentikan') ||
      keteranganLower.includes('paused') ||
      keteranganLower.includes('stopped') ||
      fullText.includes('task stopped') ||
      fullText.includes('task paused')
    ) {
      return 'STOP';
    }

    // KIRIM UNTUK REVIEW
    if (
      fullText.includes('dikirim untuk review') ||
      fullText.includes('kirim untuk review') ||
      keteranganLower.includes('dikirim untuk review')
    ) {
      return 'KIRIM';
    }

    // REJECT events
    if (
      actionLower === 'reject' ||
      statusLower === 'rejected' ||
      fullText.includes('direject') ||
      fullText.includes('rejected') ||
      fullText.includes('task direject')
    ) {
      return 'REJECT';
    }

    // APPROVE events
    if (
      actionLower === 'approve' ||
      actionLower === 'complete' ||
      statusLower === 'selesai' ||
      statusLower === 'completed' ||
      fullText.includes('di-approve') ||
      fullText.includes('approved') ||
      fullText.includes('selesai') ||
      fullText.includes('completed') ||
      fullText.includes('task di-approve') ||
      keteranganLower.includes('di-approve')
    ) {
      return 'APPROVE';
    }

    return 'OTHER';
  };

  // Parse logs chronologically
  for (const log of logs) {
    const eventType = getEventType(log.action || '', log.keterangan || '', log.status || '');

    // Skip EDIT events
    if (eventType === 'EDIT') {
      continue;
    }

    switch (eventType) {
      case 'START':
        lastStartTime = log.waktu;
        break;

      case 'STOP':
        // Calculate START → STOP duration and accumulate
        if (lastStartTime) {
          const workDuration = (log.waktu.getTime() - lastStartTime.getTime()) / (1000 * 60);
          if (workDuration >= 0) {
            totalWorkDuration += workDuration;
          }
          lastStartTime = null; // Reset for next cycle
        }
        break;

      case 'KIRIM':
        // If there's an active START without STOP, calculate until KIRIM
        if (lastStartTime) {
          const workDuration = (log.waktu.getTime() - lastStartTime.getTime()) / (1000 * 60);
          if (workDuration >= 0) {
            totalWorkDuration += workDuration;
          }
          lastStartTime = null;
        }
        lastKirimTime = log.waktu;
        break;

      case 'REJECT':
        // Calculate KIRIM → REJECT duration
        if (lastKirimTime) {
          const reviewDuration = (log.waktu.getTime() - lastKirimTime.getTime()) / (1000 * 60);
          if (reviewDuration >= 0) {
            totalReviewDuration += reviewDuration;
          }
          rejectCount++;
          lastKirimTime = null; // Reset for next cycle
          lastStartTime = null; // Will be set by next START
        }
        break;

      case 'APPROVE':
        // If we have lastKirimTime, calculate KIRIM → APPROVE (review duration)
        if (lastKirimTime) {
          const reviewDuration = (log.waktu.getTime() - lastKirimTime.getTime()) / (1000 * 60);
          if (reviewDuration >= 0) {
            totalReviewDuration += reviewDuration;
          }
          isApproved = true;
          lastKirimTime = null;
        }
        // If we have lastStartTime but NO lastKirimTime, calculate START → APPROVE as work duration
        else if (lastStartTime) {
          const workDuration = (log.waktu.getTime() - lastStartTime.getTime()) / (1000 * 60);
          if (workDuration >= 0) {
            totalWorkDuration += workDuration;
          }
          isApproved = true;
          lastStartTime = null;
        }
        break;
    }
  }

  const total = Math.round(totalWorkDuration + totalReviewDuration);

  return {
    total,
    breakdown: {
      startToKirimDuration: Math.round(totalWorkDuration),
      kirimToApproveDuration: Math.round(totalReviewDuration),
      rejectCount,
      isApproved
    }
  };
}

/**
 * GET /api/admin/recalculate-duration-v2
 * Get comparison of old vs new duration calculations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthsBack = parseInt(searchParams.get('monthsBack') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Calculate date range (last N months)
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    startDate.setHours(0, 0, 0, 0);

    // Get tasks created in the date range
    const tasks = await prisma.tasklist.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      select: {
        id: true,
        kode: true,
        totalDurationMinutes: true,
        createdAt: true
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Calculate new durations
    const calculations: DurationCalculation[] = [];
    for (const task of tasks) {
      const durationResult = await calculateTaskDuration(task.id);
      const oldDuration = task.totalDurationMinutes || 0;
      const newDuration = durationResult.total;
      const difference = newDuration - oldDuration;

      calculations.push({
        taskId: task.id,
        taskCode: task.kode || `TASK-${task.id}`,
        oldDuration,
        newDuration,
        difference,
        status: difference === 0 ? 'SAME' : difference > 0 ? 'INCREASED' : 'DECREASED',
        breakdown: durationResult.breakdown
      });
    }

    // Calculate statistics
    const stats = {
      totalTasks: calculations.length,
      tasksWithDifference: calculations.filter(c => c.difference !== 0).length,
      totalOldDuration: calculations.reduce((sum, c) => sum + c.oldDuration, 0),
      totalNewDuration: calculations.reduce((sum, c) => sum + c.newDuration, 0),
      totalDifference: calculations.reduce((sum, c) => sum + c.difference, 0),
      averageOldDuration: Math.round(calculations.reduce((sum, c) => sum + c.oldDuration, 0) / calculations.length),
      averageNewDuration: Math.round(calculations.reduce((sum, c) => sum + c.newDuration, 0) / calculations.length)
    };

    return NextResponse.json({
      success: true,
      dateRange: {
        from: startDate.toISOString(),
        to: now.toISOString(),
        monthsBack
      },
      stats,
      calculations
    });
  } catch (error) {
    console.error('Error calculating durations:', error);
    return NextResponse.json(
      { error: 'Failed to calculate durations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/recalculate-duration-v2
 * Apply the new duration calculations to database
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskIds } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'taskIds must be a non-empty array' }, { status: 400 });
    }

    // Update each task with new calculated duration
    const results = [];
    for (const taskId of taskIds) {
      const durationResult = await calculateTaskDuration(taskId);
      
      const updated = await prisma.tasklist.update({
        where: { id: taskId },
        data: { totalDurationMinutes: durationResult.total },
        select: { id: true, kode: true, totalDurationMinutes: true }
      });

      results.push({
        taskId: updated.id,
        taskCode: updated.kode,
        newDuration: updated.totalDurationMinutes,
        breakdown: durationResult.breakdown
      });
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.length} tasks`,
      updated: results
    });
  } catch (error) {
    console.error('Error updating durations:', error);
    return NextResponse.json(
      { error: 'Failed to update durations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
