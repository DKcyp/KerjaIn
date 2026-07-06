import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

// GET /api/reports/tasks - Get task reports with completion statistics
export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const projectId = searchParams.get('projectId');

    // Build where clause
    const where: any = {};
    
    // Date range filter
    if (from || to) {
      where.scheduleAt = {};
      if (from) where.scheduleAt.gte = new Date(from);
      if (to) where.scheduleAt.lte = new Date(to);
    }

    // Project filter
    if (projectId && projectId !== 'all') {
      where.projectId = Number(projectId);
    }

    // Role-based filtering
    if (session && (session.role === 'PROGRAMMER' || session.role === 'ADMIN')) {
      where.pegawaiId = Number(session.id);
    } else if (session && session.role === 'PM') {
      const uid = Number(session.id);
      const team = await prisma.proyekTeam.findMany({
        where: { pegawaiId: uid },
        select: { projectId: true },
      });
      const projectIds = Array.from(new Set(team.map((t) => t.projectId)));
      if (projectIds.length === 0) {
        return NextResponse.json({ items: [], stats: { selesai: 0, overdue: 0, onProgress: 0 } });
      }
      where.projectId = { in: projectIds };
    }

    // Fetch tasks with related data
    const tasks = await prisma.tasklist.findMany({
      where,
      orderBy: { scheduleAt: 'desc' },
    });

    // Fetch related project and pegawai names
    const projectIds = [...new Set(tasks.map((t) => t.projectId))];
    const pegawaiIds = [...new Set(tasks.map((t) => t.pegawaiId))];
    const moduleIds = [...new Set(tasks.map((t) => t.moduleId))];

    const [projects, pegawais, modules] = await Promise.all([
      prisma.proyek.findMany({ where: { id: { in: projectIds } } }),
      prisma.pegawai.findMany({ where: { id: { in: pegawaiIds } } }),
      prisma.proyekModule.findMany({ where: { id: { in: moduleIds } } }),
    ]);

    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const pegawaiMap = new Map(pegawais.map((p) => [p.id, p]));
    const moduleMap = new Map(modules.map((m) => [m.id, m]));

    // Calculate task status
    const now = new Date();
    const tasksWithDetails = tasks.map((t) => {
      const isOverdue = t.status !== 'SELESAI' && new Date(t.scheduleAt) < now;
      const status = t.status === 'SELESAI' ? 'Selesai' : isOverdue ? 'Overdue' : 'On Progress';

      return {
        id: t.id,
        namaTask: `${t.kode} - ${moduleMap.get(t.moduleId)?.nama || 'Task'}`,
        proyek: projectMap.get(t.projectId)?.namaProyek || 'Unknown',
        ditugaskanKepada: pegawaiMap.get(t.pegawaiId)?.namaLengkap || 'Unknown',
        dueDate: t.scheduleAt.toISOString().split('T')[0],
        status,
        keterangan: t.keterangan,
      };
    });

    // Calculate statistics
    const stats = {
      selesai: tasksWithDetails.filter((t) => t.status === 'Selesai').length,
      overdue: tasksWithDetails.filter((t) => t.status === 'Overdue').length,
      onProgress: tasksWithDetails.filter((t) => t.status === 'On Progress').length,
    };

    return NextResponse.json({
      items: tasksWithDetails,
      stats,
      total: tasksWithDetails.length,
    });
  } catch (e) {
    console.error('GET /api/reports/tasks error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
