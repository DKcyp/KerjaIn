import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/dashboard/pm-today-tasks
// For PM: returns today's tasks from all projects the PM is a team member of
// For SUPER_ADMIN/ADMIN: returns all today's tasks
export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    let projectFilter: { projectId?: { in: number[] } } = {};

    if (session.role === 'PM') {
      // Step 1: Find all projects this PM is part of
      const teamEntries = await prisma.proyekTeam.findMany({
        where: { pegawaiId: session.id },
        select: { projectId: true },
      });

      const projectIds = teamEntries.map((t) => t.projectId);

      if (projectIds.length === 0) {
        // PM not in any project - return empty
        return NextResponse.json({ items: [], total: 0 });
      }

      projectFilter = { projectId: { in: projectIds } };
    }
    // For SUPER_ADMIN / ADMIN: no project filter (see all)

    const tasks = await prisma.tasklist.findMany({
      where: {
        ...projectFilter,
        OR: [
          { scheduleAt: { gte: todayStart, lte: todayEnd } },
          { updatedAt: { gte: todayStart, lte: todayEnd } },
        ],
      },
      include: {
        project: { select: { namaProyek: true, kodeProyek: true } },
        module: { select: { nama: true, kode: true } },
        pegawai: { select: { namaLengkap: true } },
      },
      orderBy: { scheduleAt: 'desc' },
      take: 100,
    });

    const items = tasks.map((t) => {
      const due = t.calculatedDueDate ? new Date(t.calculatedDueDate) : null;
      const isCompleted = t.status === 'SELESAI';
      let isLate = false;

      if (isCompleted) {
        // For completed tasks, check if completed after due date
        const updatedAt = t.updatedAt ? new Date(t.updatedAt) : null;
        if (due && updatedAt && updatedAt > due) isLate = true;
      } else {
        if (due && new Date() > due) isLate = true;
      }

      return {
        id: t.id,
        kode: t.kode,
        proyekNama: t.project?.namaProyek || '',
        moduleNama: t.module?.nama || '',
        programmerName: t.pegawai?.namaLengkap || 'Unassigned',
        status: t.status,
        taskComplexity: t.taskComplexity || 'MEDIUM',
        calculatedDueDate: t.calculatedDueDate ? t.calculatedDueDate.toISOString() : null,
        isLate,
        scheduleAt: t.scheduleAt.toISOString(),
      };
    });

    return NextResponse.json({ items, total: items.length });
  } catch (e) {
    console.error('GET /api/dashboard/pm-today-tasks error:', e);
    return NextResponse.json(
      { error: 'Server error', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
