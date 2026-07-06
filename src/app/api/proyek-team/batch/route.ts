import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

// GET /api/proyek-team/batch?projectIds=1,2,3,4,5
// Returns team data for multiple projects in a single request
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectIdsParam = url.searchParams.get('projectIds');

    if (!projectIdsParam) {
      return NextResponse.json({ error: 'projectIds parameter required' }, { status: 400 });
    }

    // Parse project IDs
    const projectIds = projectIdsParam
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));

    if (projectIds.length === 0) {
      return NextResponse.json({ items: {} });
    }

    // Fetch team data for all projects at once
    const teamData = await prisma.proyekTeam.findMany({
      where: {
        projectId: {
          in: projectIds
        }
      },
      select: {
        id: true,
        projectId: true,
        pegawaiId: true,
        jabatan: true,
        teamSource: true
      }
    });

    // Group by projectId for easier client-side processing
    const grouped: Record<number, any[]> = {};
    for (const projectId of projectIds) {
      grouped[projectId] = [];
    }

    for (const team of teamData) {
      if (!grouped[team.projectId]) {
        grouped[team.projectId] = [];
      }
      grouped[team.projectId].push({
        id: team.id,
        pegawaiId: team.pegawaiId,
        jabatan: team.jabatan,
        teamSource: team.teamSource
      });
    }

    const response = NextResponse.json({ items: grouped });
    // Add caching headers to reduce duplicate requests (30 second cache)
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;
  } catch (e) {
    console.error('GET /api/proyek-team/batch error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
