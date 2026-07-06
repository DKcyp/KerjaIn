import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startTask, pauseTask, resumeTask, stopTask, completeTask, getTaskTimeInfo } from '@/lib/taskTimeTracker';
import { validateCurrentUserWorkingHours, validateProgrammerActionTime, createWorkingHoursErrorResponse } from '@/lib/taskValidation';
import { updateProgrammerStatus, checkActiveTasks, getActiveTaskInfo } from '@/lib/programmerStatus';

/**
 * External API endpoint for tasklist time tracking
 *
 * GET  /api/external/tasklist/[id]/time-tracking - Get current time tracking info
 * POST /api/external/tasklist/[id]/time-tracking - Perform time tracking action
 *
 * Authentication: X-API-Key header (EXTERNAL_API_KEY)
 *
 * POST Body (JSON):
 * {
 *   "action": "start" | "pause" | "resume" | "stop" | "complete",
 *   "userId": 123,           // Required: ID of the user performing the action
 *   "note": "string",        // Optional: note for the action
 *   "hasImage": false        // Optional: whether the action includes an image
 * }
 */

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.EXTERNAL_API_KEY;
  if (!validApiKey) {
    console.error('EXTERNAL_API_KEY not configured in environment');
    return false;
  }
  return apiKey === validApiKey;
}

// GET /api/external/tasklist/[id]/time-tracking
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const taskId = parseInt(id);
    if (!taskId || isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    const timeInfo = await getTaskTimeInfo(taskId);
    if (!timeInfo) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { timeInfo } });
  } catch (error) {
    console.error('Error getting task time info via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get time info', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/external/tasklist/[id]/time-tracking
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;
    const taskId = parseInt(id);
    if (!taskId || isNaN(taskId)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, userId, note, hasImage } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { success: false, error: 'action is required. Supported: start, pause, resume, stop, complete' },
        { status: 400 }
      );
    }

    if (!userId || !Number.isFinite(Number(userId))) {
      return NextResponse.json(
        { success: false, error: 'userId is required and must be a valid number' },
        { status: 400 }
      );
    }

    const uid = Number(userId);
    let result;

    // Working hours validation (mirrors internal behavior)
    switch (action.toLowerCase()) {
      case 'start': {
        const whCheck = await validateCurrentUserWorkingHours(uid.toString());
        if (!whCheck.isWorkingHours) {
          return NextResponse.json({
            success: false,
            error: 'OUTSIDE_WORKING_HOURS',
            message: `Cannot start task outside working hours. ${whCheck.message}`,
            workingHours: { start: whCheck.workingHoursStart, end: whCheck.workingHoursEnd, currentTime: whCheck.currentTime },
          }, { status: 400 });
        }
        result = await startTask(taskId, uid);
        break;
      }
      case 'pause':
      case 'resume':
      case 'stop':
      case 'complete': {
        const validation = await validateProgrammerActionTime(uid.toString(), action.toLowerCase());
        if (!validation.isAllowed) {
          return NextResponse.json(
            { success: false, error: 'Outside working hours', details: createWorkingHoursErrorResponse(validation) },
            { status: 400 }
          );
        }
        if (action.toLowerCase() === 'pause') result = await pauseTask(taskId, uid);
        else if (action.toLowerCase() === 'resume') result = await resumeTask(taskId, uid);
        else if (action.toLowerCase() === 'stop') result = await stopTask(taskId, uid);
        else result = await completeTask(taskId, uid, note, hasImage);
        break;
      }
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported: start, pause, resume, stop, complete' },
          { status: 400 }
        );
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to perform time tracking action' },
        { status: 500 }
      );
    }

    // Auto-update programmer status (mirrors internal behavior)
    try {
      const task = await prisma.tasklist.findUnique({
        where: { id: taskId },
        select: { pegawaiId: true, projectId: true, kode: true },
      });
      if (task && task.pegawaiId) {
        const programmerId = task.pegawaiId;
        switch (action.toLowerCase()) {
          case 'start':
          case 'resume': {
            const activeTaskInfo = await getActiveTaskInfo(programmerId);
            await updateProgrammerStatus({ programmerId, status: 'Work', notes: activeTaskInfo, updatedBy: uid });
            break;
          }
          case 'stop':
          case 'pause':
          case 'complete': {
            const hasOtherTasks = await checkActiveTasks(programmerId);
            if (hasOtherTasks) {
              const remainingTaskInfo = await getActiveTaskInfo(programmerId);
              await updateProgrammerStatus({ programmerId, status: 'Work', notes: remainingTaskInfo, updatedBy: uid });
            } else {
              await updateProgrammerStatus({ programmerId, status: 'Free', notes: null, updatedBy: uid });
            }
            break;
          }
        }
      }
    } catch (statusErr) {
      console.error('[ProgrammerStatus] Auto-update failed (non-fatal):', statusErr);
    }

    return NextResponse.json({
      success: true,
      message: `Time tracking action '${action.toLowerCase()}' completed`,
      data: { action: action.toLowerCase(), timeInfo: result },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('not found')) {
      return NextResponse.json({ success: false, error: msg }, { status: 404 });
    }
    if (msg.includes('cannot be') || msg.includes('Only the')) {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }
    console.error('Error performing time tracking action via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action', details: msg },
      { status: 500 }
    );
  }
}
