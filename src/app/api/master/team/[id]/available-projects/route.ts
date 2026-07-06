import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/master/team/[id]/available-projects - Get projects not yet grouped for this team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id);

    // Get all projects assigned to this team
    const teamProjects = await prisma.proyek.findMany({
      where: {
        teamId,
        isActive: true,
      },
      select: {
        id: true,
        namaProyek: true,
        kodeProyek: true,
        isActive: true,
      },
    });

    // Get projects already in groups for this team
    const groupedProjectIds = await prisma.projectGroupItem.findMany({
      where: {
        group: {
          teamId,
        },
      },
      select: {
        projectId: true,
      },
    });

    const groupedIds = new Set(groupedProjectIds.map((item) => item.projectId));

    // Filter out already grouped projects
    const availableProjects = teamProjects.filter(
      (project) => !groupedIds.has(project.id)
    );

    return NextResponse.json(availableProjects);
  } catch (error) {
    console.error('Error fetching available projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available projects' },
      { status: 500 }
    );
  }
}
