const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateStartStopDuration() {
  try {
    console.log('Starting to populate totalStartStopMinutes...');

    // Get all unique taskIds
    const taskIds = await prisma.tasklistLog.findMany({
      distinct: ['taskId'],
      select: { taskId: true }
    });

    console.log(`Found ${taskIds.length} unique tasks`);

    for (const { taskId } of taskIds) {
      // Get all logs for this task, ordered by time
      const logs = await prisma.tasklistLog.findMany({
        where: { taskId },
        orderBy: { waktu: 'asc' }
      });

      let cumulativeDuration = 0;
      let taskUpdated = 0;

      // Process each log - calculate cumulative duration from time differences
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        const action = log.action?.toLowerCase() || '';
        const keterangan = log.keterangan?.toLowerCase() || '';
        const fullText = `${action} ${keterangan}`.toLowerCase();

        // Detect if this is an event that adds to cumulative
        // STOP/KIRIM (work end) and REJECT/APPROVE (review end)
        const isCountableEvent = 
          action === 'stop' ||
          action === 'pause' ||
          keterangan.includes('dihentikan') ||
          keterangan.includes('paused') ||
          fullText.includes('task stopped') ||
          fullText.includes('task paused') ||
          fullText.includes('dikirim untuk review') ||
          action === 'reject' ||
          fullText.includes('direject') ||
          fullText.includes('rejected') ||
          action === 'approve' ||
          action === 'complete' ||
          fullText.includes('di-approve') ||
          fullText.includes('approved');

        // Calculate duration from previous event to this event ONLY for countable events
        if (i > 0 && isCountableEvent) {
          const prevLog = logs[i - 1];
          const duration = (log.waktu.getTime() - prevLog.waktu.getTime()) / (1000 * 60);
          if (duration >= 0) {
            cumulativeDuration += duration;
          }
        }

        // Store cumulative duration for all events
        await prisma.tasklistLog.update({
          where: { id: log.id },
          data: { totalStartStopMinutes: Math.round(cumulativeDuration) }
        });
        taskUpdated++;
      }

      console.log(`Task ${taskId}: Updated ${taskUpdated} logs, final total: ${Math.round(cumulativeDuration)}m`);
    }

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateStartStopDuration();
