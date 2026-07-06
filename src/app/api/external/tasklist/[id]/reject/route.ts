import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProgrammerActionTime, createWorkingHoursErrorResponse } from '@/lib/taskValidation';

/**
 * External API endpoint for rejecting a tasklist
 *
 * PUT /api/external/tasklist/[id]/reject - Reject task (set status back to MENUNGGU_PROSES_USER)
 *
 * Authentication: X-API-Key header (EXTERNAL_API_KEY)
 *
 * Request Body (JSON):
 * {
 *   "keterangan": "string",   // Required: rejection reason
 *   "rejectorId": 123          // Optional: ID of the rejector (pegawai ID)
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

async function ensureLogTable() {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS public.tasklist_log (
        id SERIAL PRIMARY KEY,
        "taskId" INT NOT NULL,
        waktu TIMESTAMP NOT NULL DEFAULT NOW(),
        "userId" INT NOT NULL,
        keterangan TEXT NULL,
        status TEXT NULL,
        action TEXT NOT NULL
      );`
    );
    await prisma.$executeRawUnsafe(`ALTER TABLE public.tasklist_log ADD COLUMN IF NOT EXISTS "imagePath" TEXT NULL;`);
  } catch {
    // ignore
  }
}

// PUT /api/external/tasklist/[id]/reject
export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    let keterangan = '';
    let rejectorId: number | null = null;
    try {
      const body = await request.json();
      keterangan = body?.keterangan || '';
      if (body?.rejectorId) rejectorId = Number(body.rejectorId);
    } catch {
      // body parsing failed
    }

    if (!keterangan.trim()) {
      return NextResponse.json(
        { success: false, error: 'keterangan (rejection reason) is required' },
        { status: 400 }
      );
    }

    // Validate working hours if rejectorId is provided (mirrors internal behavior)
    if (rejectorId) {
      const workingHoursValidation = await validateProgrammerActionTime(rejectorId.toString(), 'reject');
      if (!workingHoursValidation.isAllowed) {
        return NextResponse.json(
          { success: false, error: 'Outside working hours', details: createWorkingHoursErrorResponse(workingHoursValidation) },
          { status: 400 }
        );
      }
    }

    const task = await prisma.tasklist.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'MENUNGGU_REVIEW_PM') {
      return NextResponse.json(
        { success: false, error: `Cannot reject. Current status: ${task.status}. Task must be MENUNGGU_REVIEW_PM.` },
        { status: 422 }
      );
    }

    const updated = await prisma.tasklist.update({
      where: { id },
      data: { status: 'MENUNGGU_PROSES_USER' },
    });

    // Log activity
    try {
      await ensureLogTable();
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.tasklist_log ("taskId", "userId", keterangan, status, action)
         VALUES ($1, $2, $3, $4, $5)`,
        id,
        rejectorId || 0,
        keterangan,
        'MENUNGGU_PROSES_USER',
        'status_change'
      );
    } catch (logErr) {
      console.error('Non-fatal: failed to log rejection activity', logErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Task rejected successfully',
      data: {
        id: updated.id,
        kode: updated.kode,
        status: updated.status,
        statusCode: 1,
        keterangan,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error rejecting task via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject task', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
