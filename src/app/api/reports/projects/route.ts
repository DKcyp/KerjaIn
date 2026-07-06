import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

// GET /api/reports/projects - Get project reports with stage distribution
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
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // Project filter
    if (projectId && projectId !== 'all') {
      where.id = Number(projectId);
    }

    // Role-based filtering
    if (session && (session.role === 'PM' || session.role === 'PROGRAMMER')) {
      const uid = Number(session.id);
      const team = await prisma.proyekTeam.findMany({
        where: { pegawaiId: uid },
        select: { projectId: true },
      });
      const ids = Array.from(new Set(team.map((t) => t.projectId)));
      if (ids.length === 0) {
        return NextResponse.json({ items: [], stageDistribution: {} });
      }
      where.id = { in: ids };
    }

    // Fetch projects
    const projects = await prisma.proyek.findMany({
      where,
      orderBy: { noUrut: 'asc' },
    });

    // For now, return projects with dummy stage data
    // In production, you'd calculate this from actual project stage tracking
    const projectsWithStages = projects.map((p) => ({
      id: p.id,
      namaProyek: p.namaProyek,
      kodeProyek: p.kodeProyek,
      client: 'Client Name', // Add to schema if needed
      projectManager: 'PM Name', // Get from ProyekTeam
      tanggalMulai: p.createdAt.toISOString().split('T')[0],
      statusTahap: 'Development', // Add to schema if needed
      progres: 50, // Calculate from tasks
      tahap: 'Development',
    }));

    // Calculate stage distribution
    const stageDistribution: Record<string, number> = {
      Blueprint: 0,
      Development: 0,
      UAT: 0,
      EUT: 0,
      'Go-Live': 0,
      Support: 0,
    };

    projectsWithStages.forEach((p) => {
      if (stageDistribution[p.tahap] !== undefined) {
        stageDistribution[p.tahap]++;
      }
    });

    return NextResponse.json({
      items: projectsWithStages,
      stageDistribution,
      total: projectsWithStages.length,
    });
  } catch (e) {
    console.error('GET /api/reports/projects error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
