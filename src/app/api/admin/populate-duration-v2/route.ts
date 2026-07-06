import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/populate-duration-v2
 * Populate totalStartStopMinutes for all tasklist_log entries (v2 - correct logic)
 * 
 * Logic:
 * - Work Duration = START → KIRIM (time spent working)
 * - Review Duration = KIRIM → APPROVE/REJECT (time spent in review)
 * - Custom Duration = customDurationHours from tasklist
 * - Total = work duration + review duration + custom duration
 * - EDIT events are skipped
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting to populate totalStartStopMinutes (v2 - correct logic)...');

    // Get all unique taskIds
    const taskIds = await prisma.tasklistLog.findMany({
      distinct: ['taskId'],
      select: { taskId: true }
    });

    console.log(`Found ${taskIds.length} unique tasks`);

    let totalUpdated = 0;
    const results = [];

    // Helper to detect event type
    const getEventType = (action: string | null, keterangan: string | null, status: string | null) => {
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

    for (const { taskId } of taskIds) {
      // Get all logs for this task, ordered by time
      const logs = await prisma.tasklistLog.findMany({
        where: { taskId },
        orderBy: { waktu: 'asc' }
      });

      // Get task to check for custom duration
      const task = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { customDurationHours: true }
      });

      let totalWorkDuration = 0;      // START → KIRIM
      let totalReviewDuration = 0;    // KIRIM → APPROVE/REJECT
      let lastStartTime: Date | null = null;
      let lastKirimTime: Date | null = null;

      // Process each log
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const eventType = getEventType(log.action, log.keterangan, log.status);

        // Skip EDIT events
        if (eventType === 'EDIT') {
          continue;
        }

        switch (eventType) {
          case 'START':
            lastStartTime = log.waktu;
            lastKirimTime = null; // Reset review time
            break;

          case 'KIRIM':
            // Calculate START → KIRIM duration
            if (lastStartTime) {
              const workDuration = (log.waktu.getTime() - lastStartTime.getTime()) / (1000 * 60);
              if (workDuration >= 0) {
                totalWorkDuration += workDuration;
              }
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
              lastKirimTime = null;
            }
            // If we have lastStartTime but NO lastKirimTime, calculate START → APPROVE as work duration
            else if (lastStartTime) {
              const workDuration = (log.waktu.getTime() - lastStartTime.getTime()) / (1000 * 60);
              if (workDuration >= 0) {
                totalWorkDuration += workDuration;
              }
              lastStartTime = null;
            }
            break;
        }
      }

      // Calculate final total
      const customMinutes = task?.customDurationHours ? Math.round(Number(task.customDurationHours) * 60) : 0;
      const finalTotal = Math.round(totalWorkDuration + totalReviewDuration + customMinutes);

      // Update all logs with final total (for backward compatibility)
      for (const log of logs) {
        const eventType = getEventType(log.action, log.keterangan, log.status);
        if (eventType !== 'EDIT') {
          await prisma.tasklistLog.update({
            where: { id: log.id },
            data: { totalStartStopMinutes: finalTotal }
          });
          totalUpdated++;
        }
      }

      results.push({
        taskId,
        work: Math.round(totalWorkDuration),
        review: Math.round(totalReviewDuration),
        custom: customMinutes,
        total: finalTotal
      });
    }

    console.log(`Done! Total updated: ${totalUpdated}`);

    return NextResponse.json({
      success: true,
      message: `Populated ${totalUpdated} log entries`,
      tasksProcessed: taskIds.length,
      totalUpdated,
      results
    });
  } catch (error) {
    console.error('Error populating duration:', error);
    return NextResponse.json(
      { error: 'Failed to populate duration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
