import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { notifyCRMTaskCompleted, shouldNotifyCRM, getTaskTicketId } from '@/lib/crmNotificationService';

export const runtime = 'nodejs';

/**
 * POST /api/tasklist/[id]/notify-crm
 * 
 * Sends CRM notification with completion notes and optional image
 * Called when PM approves a task that has idCrm
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await ctx.params;
    const taskId = Number(idStr);

    if (!Number.isFinite(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Check authentication
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only PM or SUPER_ADMIN can send CRM notifications
    const isPM = session.role === 'PM' || session.role === 'SUPER_ADMIN';
    if (!isPM) {
      return NextResponse.json({ error: 'Only PM can send CRM notifications' }, { status: 403 });
    }

    // Get task details
    const task = await prisma.tasklist.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if task has CRM ID
    if (!shouldNotifyCRM(task)) {
      return NextResponse.json({ 
        error: 'Task does not have CRM ticket ID' 
      }, { status: 400 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const completionNotes = formData.get('completionNotes') as string;
    const imageFile = formData.get('image') as File | null;

    if (!completionNotes || completionNotes.trim() === '') {
      return NextResponse.json({ 
        error: 'Completion notes are required' 
      }, { status: 400 });
    }

    // Prepare image buffer if provided
    let imageBuffer: Buffer | undefined;
    let imageFilename: string | undefined;

    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      imageBuffer = Buffer.from(bytes);
      imageFilename = imageFile.name || `task_${task.kode}_${Date.now()}.png`;
    }

    // Get completed by info - fetch pegawai separately
    const pegawai = await prisma.pegawai.findUnique({
      where: { id: task.pegawaiId },
      select: { namaLengkap: true, username: true }
    });
    
    const completedBy = pegawai 
      ? `${pegawai.namaLengkap} (${pegawai.username})` 
      : 'Unknown';

    // Send notification to CRM - use helper to get ticket ID from any field
    const ticketId = getTaskTicketId(task);
    if (!ticketId) {
      return NextResponse.json({ 
        error: 'Task does not have a valid ticket ID' 
      }, { status: 400 });
    }
    
    const result = await notifyCRMTaskCompleted(
      ticketId,
      task.kode || `Task-${task.id}`,
      task.idCrm || `Task-${task.id}`,
      completedBy,
      completionNotes,
      imageBuffer,
      imageFilename
    );

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to notify CRM' 
      }, { status: 500 });
    }

    console.log(`[CRM Integration] Successfully notified CRM for task ${task.kode}`);

    return NextResponse.json({
      success: true,
      message: 'CRM notification sent successfully',
      ticket: result.ticket
    });

  } catch (error: any) {
    console.error('[CRM Integration] Error in notify-crm endpoint:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
