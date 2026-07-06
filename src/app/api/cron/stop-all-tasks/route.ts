import { NextRequest, NextResponse } from 'next/server';
import { stopAllActiveTasks, getStopAllTasksStats } from '@/lib/stopAllTasksService';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for processing

/**
 * GET /api/cron/stop-all-tasks
 * Health check and stats endpoint
 */
export async function GET(_req: NextRequest) {
  try {
    const stats = await getStopAllTasksStats();
    
    return NextResponse.json({
      status: 'healthy',
      service: 'stop-all-tasks',
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    console.error('GET /api/cron/stop-all-tasks error:', error);
    return NextResponse.json(
      { 
        error: 'Server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/stop-all-tasks
 * Stop all active tasks and send notifications
 * 
 * Body (optional):
 * {
 *   "reason": "Custom reason for stopping",
 *   "sendAdminNotification": true
 * }
 */
export async function POST(req: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[API] POST /api/cron/stop-all-tasks called');
  console.log('[API] Timestamp:', new Date().toISOString());
  
  try {
    // Parse request body (optional)
    let reason: string | undefined;
    let sendAdminNotification = true;

    try {
      const body = await req.json();
      reason = body.reason;
      sendAdminNotification = body.sendAdminNotification !== false;
    } catch {
      // Body is optional, use defaults
      console.log('[API] No body provided, using defaults');
    }

    console.log('[API] Reason:', reason || 'Auto-stop (end of work hours)');
    console.log('[API] Send admin notification:', sendAdminNotification);

    // Execute stop all tasks
    const result = await stopAllActiveTasks(reason, sendAdminNotification);

    console.log('[API] ✅ Request completed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully stopped ${result.stoppedCount} active tasks`
        : 'Failed to stop all tasks',
      data: {
        stoppedCount: result.stoppedCount,
        notificationsSent: result.notificationsSent,
        notificationsFailed: result.notificationsFailed,
        timestamp: result.timestamp
      },
      tasks: result.stoppedTasks.map(t => ({
        id: t.id,
        kode: t.kode,
        programmer: t.pegawaiNama,
        project: t.proyekNama,
        module: t.modulNama,
        sessionDuration: `${t.sessionDurationMinutes} minutes`,
        totalDuration: `${t.totalDurationMinutes} minutes`
      })),
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  } catch (error) {
    console.error('[API] ❌ Fatal error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
