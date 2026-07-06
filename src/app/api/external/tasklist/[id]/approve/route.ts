import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateProgrammerActionTime, createWorkingHoursErrorResponse } from '@/lib/taskValidation';

/**
 * External API endpoint for approving a tasklist
 *
 * PUT /api/external/tasklist/[id]/approve - Approve task (set status to SELESAI)
 *
 * Authentication: X-API-Key header (EXTERNAL_API_KEY)
 *
 * Request Body (JSON):
 * {
 *   "keterangan": "string",   // Optional approval note
 *   "approverId": 123          // Optional: ID of the approver (pegawai ID). If provided, validates working hours.
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

// PUT /api/external/tasklist/[id]/approve
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
    let approverId: number | null = null;
    try {
      const body = await request.json();
      keterangan = body?.keterangan || '';
      if (body?.approverId) approverId = Number(body.approverId);
    } catch {
      // body is optional
    }

    // Validate working hours if approverId is provided (mirrors internal behavior)
    if (approverId) {
      const workingHoursValidation = await validateProgrammerActionTime(approverId.toString(), 'approve');
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
        { success: false, error: `Cannot approve. Current status: ${task.status}. Task must be MENUNGGU_REVIEW_PM.` },
        { status: 422 }
      );
    }

    const updated = await prisma.tasklist.update({
      where: { id },
      data: { status: 'SELESAI' },
    });

    // Log activity
    try {
      await ensureLogTable();
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.tasklist_log ("taskId", "userId", keterangan, status, action)
         VALUES ($1, $2, $3, $4, $5)`,
        id,
        approverId || 0,
        keterangan || 'Disetujui via external API',
        'SELESAI',
        'status_change'
      );
    } catch (logErr) {
      console.error('Non-fatal: failed to log approval activity', logErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Task approved successfully',
      data: {
        id: updated.id,
        kode: updated.kode,
        status: updated.status,
        statusCode: 4,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error approving task via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve task', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
