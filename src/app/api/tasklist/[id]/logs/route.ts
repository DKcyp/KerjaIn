import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Ensure log table exists (safe, non-destructive)
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

// GET /api/tasklist/[id]/logs
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    await ensureLogTable();

    // First, get the task creation date
    const task = await prisma.tasklist.findUnique({
      where: { id },
      select: { createdAt: true }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch logs newest first and enrich with user name via raw SQL
    // IMPORTANT: Subtract 2 seconds from createdAt to ensure creation log is included
    // (creation log uses NOW() which might be slightly before task.createdAt due to timing)

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

    const filterTime = new Date(task.createdAt.getTime() - 2000); // 2 seconds buffer

    console.log(`📋 [LOGS] Fetching logs for task ${id}`);
    console.log(`📋 [LOGS] Task createdAt: ${task.createdAt.toISOString()}`);
    console.log(`📋 [LOGS] Filter time (createdAt - 2s): ${filterTime.toISOString()}`);

    const logs = await prisma.$queryRawUnsafe<LogRow[]>(
      `SELECT id, "taskId", waktu, "userId", keterangan, status, action, "imagePath"
       FROM public.tasklist_log
       WHERE "taskId" = ${id}
         AND waktu >= '${filterTime.toISOString()}'
       ORDER BY waktu DESC`
    );

    console.log(`📋 [LOGS] Found ${logs?.length || 0} logs for task ${id}`);

    if (!logs || logs.length === 0) return NextResponse.json({ items: [] });
    const userIds: number[] = Array.from(new Set(logs.map(l => Number(l.userId)).filter(v => Number.isFinite(v))));
    const pegawais = userIds.length ? await prisma.pegawai.findMany({ where: { id: { in: userIds } } }) : [];
    const mapE = new Map(pegawais.map(e => [e.id, e.namaLengkap]));
    
    // Format waktu as string to avoid timezone conversion issues
    // Database stores in WIB, we want to display in WIB
    const items = logs.map(l => {
      // Get the raw timestamp components (treating as WIB)
      const d = new Date(l.waktu);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
      const seconds = String(d.getUTCSeconds()).padStart(2, '0');
      
      // Format as ISO-like string but treat as local time
      const waktuStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      
      return {
        id: l.id,
        waktu: waktuStr,
        userId: l.userId,
        userNama: mapE.get(l.userId) || '',
        keterangan: l.keterangan ?? null,
        status: l.status ?? null,
        action: l.action || '',
        imagePath: l.imagePath ?? null,
      };
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET /api/tasklist/[id]/logs error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
