import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/pegawai/today-summary
// Returns:
// {
//   tanpaTaskHariIni: Pegawai[] (PROGRAMMER/ADMIN yang tidak punya tasklist pada hari ini),
//   terlambat: Array<{ pegawai: Pegawai, overdueCount: number }>
// }
export async function GET(_req: NextRequest) {
  try {
    // Determine today's start and end (server timezone)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    // Target roles
    const targetRoles = ['PROGRAMMER', 'ADMIN'] as const;

    // All pegawai with target roles
    const allPegawai = await prisma.pegawai.findMany({
      where: { role: { in: targetRoles as any } },
      orderBy: { noUrut: 'asc' },
      select: { id: true, namaLengkap: true, username: true, role: true, noUrut: true },
    });

    const pegawaiIds = allPegawai.map((p) => p.id);
    if (pegawaiIds.length === 0) {
      return NextResponse.json({ tanpaTaskHariIni: [], terlambat: [] });
    }

    // Distinct pegawai that have at least one task scheduled today
    const todaysAssignees = await prisma.tasklist.findMany({
      where: {
        pegawaiId: { in: pegawaiIds },
        scheduleAt: { gte: startOfToday, lt: endOfToday },
      },
      select: { pegawaiId: true },
      distinct: ['pegawaiId'],
    });
    const todaySet = new Set(todaysAssignees.map((r) => r.pegawaiId));

    const tanpaTaskHariIni = allPegawai.filter((p) => !todaySet.has(p.id));

    // Overdue: tasks scheduled before today and not completed (statusCode != 4 or status != 'SELESAI')
    // Use groupBy to compute counts per pegawai
    const overdueGroups = await (prisma.tasklist as any).groupBy({
      by: ['pegawaiId'],
      where: {
        pegawaiId: { in: pegawaiIds },
        scheduleAt: { lt: startOfToday },
        NOT: {
          OR: [
            { status: 'SELESAI' as any },
            { statusCode: 4 as any },
          ],
        },
      },
      _count: { _all: true },
    });
    const overdueMap = new Map<number, number>(overdueGroups.map((g: any) => [g.pegawaiId, g._count._all as number]));

    const terlambat = allPegawai
      .filter((p) => overdueMap.has(p.id))
      .map((p) => ({ pegawai: p, overdueCount: overdueMap.get(p.id) || 0 }));

    return NextResponse.json({ tanpaTaskHariIni, terlambat });
  } catch (e) {
    console.error('GET /api/pegawai/today-summary error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
