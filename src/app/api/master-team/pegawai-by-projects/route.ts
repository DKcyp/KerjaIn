import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// GET /api/master-team/pegawai-by-projects?projectIds=1,2,3
// Returns unique employees assigned to the given project IDs via ProyekTeam
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdsParam = searchParams.get('projectIds');

    if (!projectIdsParam) {
      return NextResponse.json({ success: false, error: 'projectIds is required' }, { status: 400 });
    }

    const projectIds = projectIdsParam
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (projectIds.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    // Fetch all ProyekTeam entries for the given project IDs, including pegawai data
    const proyekTeamEntries = await prisma.proyekTeam.findMany({
      where: {
        projectId: { in: projectIds },
      },
      select: {
        jabatan: true,
        pegawai: {
          select: {
            id: true,
            namaLengkap: true,
            noUrut: true,
          },
        },
      },
      orderBy: {
        pegawai: {
          namaLengkap: 'asc',
        },
      },
    });

    // De-duplicate by pegawai id, keep first jabatan found
    const seenIds = new Set<number>();
    const uniquePegawai = proyekTeamEntries
      .filter((entry) => {
        if (seenIds.has(entry.pegawai.id)) return false;
        seenIds.add(entry.pegawai.id);
        return true;
      })
      .map((entry) => ({
        id: entry.pegawai.id,
        nama: entry.pegawai.namaLengkap,
        jabatan: entry.jabatan || undefined,
        nip: String(entry.pegawai.noUrut).padStart(4, '0'),
      }));

    return NextResponse.json({ success: true, items: uniquePegawai });
  } catch (error) {
    console.error('Error fetching pegawai by projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pegawai' },
      { status: 500 }
    );
  }
}
