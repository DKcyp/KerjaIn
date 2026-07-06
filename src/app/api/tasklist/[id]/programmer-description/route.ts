import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

// POST /api/tasklist/[id]/programmer-description
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    // Check authentication
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    console.log('💾 SAVING PROGRAMMER DESCRIPTION:');
    console.log('Task ID:', id);
    console.log('User ID:', session.id);
    console.log('Description:', description);

    // Get task to check permission
    const task = await prisma.tasklist.findUnique({
      where: { id },
      select: { createdBy: true, kode: true }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permission check: only createdBy or SUPER_ADMIN can edit
    const user = await prisma.pegawai.findUnique({
      where: { id: session.id },
      select: { role: true }
    });

    if (task.createdBy !== session.id && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        error: 'Hanya pemberi task yang dapat mengedit catatan'
      }, { status: 403 });
    }

    // Update task with programmer description
    const updated = await prisma.tasklist.update({
      where: { id },
      data: {
        programmerDescription: description,
        updatedAt: new Date()
      }
    });

    // Log to tasklist_log
    await prisma.tasklistLog.create({
      data: {
        taskId: id,
        userId: session.id,
        action: 'UPDATE_PROGRAMMER_DESC',
        keterangan: `Catatan programmer diperbarui: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
        waktu: new Date()
      }
    });

    console.log('✅ PROGRAMMER DESCRIPTION SAVED SUCCESSFULLY');

    return NextResponse.json({
      success: true,
      message: 'Programmer description saved',
      programmerDescription: updated.programmerDescription
    });

  } catch (error) {
    console.error('❌ Error saving programmer description:', error);
    return NextResponse.json({
      error: 'Failed to save programmer description'
    }, { status: 500 });
  }
}
