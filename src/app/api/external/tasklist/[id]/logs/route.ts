import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * External API endpoint for tasklist activity logs
 *
 * GET /api/external/tasklist/[id]/logs - Fetch activity logs for a task
 *
 * Authentication: X-API-Key header (EXTERNAL_API_KEY)
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
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_task_waktu ON public.tasklist_log ("taskId", waktu DESC);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_user ON public.tasklist_log ("userId");`);
  } catch {
    // ignore
  }
}

// GET /api/external/tasklist/[id]/logs
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

    await ensureLogTable();

    const task = await prisma.tasklist.findUnique({
      where: { id },
      select: { createdAt: true },
    });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // 2-second buffer before task createdAt to ensure creation log is captured
    const filterTime = new Date(task.createdAt.getTime() - 2000);

    interface LogRow {
      id: number;
      taskId: number;
      waktu: Date;
      userId: number;
      keterangan: string | null;
      status: string | null;
      action: string;
      imagePath: string | null;
    }

    const logs = await prisma.$queryRawUnsafe<LogRow[]>(
      `SELECT id, "taskId", waktu, "userId", keterangan, status, action, "imagePath"
       FROM public.tasklist_log
       WHERE "taskId" = ${id}
         AND waktu >= '${filterTime.toISOString()}'
       ORDER BY waktu DESC`
    );

    if (!logs || logs.length === 0) {
      return NextResponse.json({ success: true, data: { items: [] } });
    }

    const userIds: number[] = Array.from(
      new Set(logs.map((l) => Number(l.userId)).filter((v) => Number.isFinite(v)))
    );
    const pegawais = userIds.length
      ? await prisma.pegawai.findMany({ where: { id: { in: userIds } } })
      : [];
    const nameMap = new Map(pegawais.map((e) => [e.id, e.namaLengkap]));

    const items = logs.map((l) => {
      const d = new Date(l.waktu);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
      const seconds = String(d.getUTCSeconds()).padStart(2, '0');
      const waktuStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      return {
        id: l.id,
        waktu: waktuStr,
        userId: l.userId,
        userNama: nameMap.get(l.userId) || '',
        keterangan: l.keterangan ?? null,
        status: l.status ?? null,
        action: l.action || '',
        imagePath: l.imagePath ?? null,
      };
    });

    return NextResponse.json({ success: true, data: { items } });
  } catch (error) {
    console.error('Error fetching task logs via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
