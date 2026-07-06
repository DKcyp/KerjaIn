import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

// Ensure connection is closed properly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

import { getServerSession } from '@/lib/auth';

// GET /api/master-team - Get all teams with their project groups
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teams = await prisma.masterTeam.findMany({
      where: {
        isActive: true,
        depId: session.user.departemenId ?? null
      },
      include: {
        members: {
          include: {
            pegawai: {
              select: {
                id: true,
                namaLengkap: true,
                role: true
              }
            }
          }
        },
        projectGroups: {
          where: {
            isActive: true
          },
          include: {
            projects: {
              include: {
                project: {
                  select: {
                    id: true,
                    kodeProyek: true,
                    namaProyek: true
                  }
                }
              }
            }
          }
        },
        projects: {
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Transform data to match frontend interface
    const transformedTeams = teams.map((team, index) => ({
      id: team.id,
      noUrut: index + 1,
      namaTeam: team.nama,
      deskripsi: team.deskripsi || '',
      projects: [
        // Individual projects (directly assigned to team)
        ...team.projects.map(project => ({
          id: `single_${project.id}`,
          namaDisplay: project.namaProyek,
          originalProjects: [project],
          isMerged: false
        })),
        // Merged projects (project groups)
        ...team.projectGroups.map(group => ({
          id: `merged_${group.id}`,
          namaDisplay: group.nama,
          originalProjects: group.projects.map(item => item.project),
          isMerged: true
        }))
      ],
      pegawai: team.members.map(m => ({
        id: m.pegawai.id,
        nama: m.pegawai.namaLengkap,
        jabatan: m.pegawai.role,
      }))
    }));

    return NextResponse.json({
      success: true,
      items: transformedTeams
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

// POST /api/master-team - Create new team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { namaTeam, deskripsi, projects, pegawaiIds } = body;

    if (!namaTeam?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama tim harus diisi' },
        { status: 400 }
      );
    }

    // Check if team name already exists
    const existingTeam = await prisma.masterTeam.findFirst({
      where: {
        nama: namaTeam.trim(),
        isActive: true,
        depId: session.user.departemenId ?? null
      }
    });

    if (existingTeam) {
      return NextResponse.json(
        { success: false, error: 'Nama tim sudah digunakan' },
        { status: 400 }
      );
    }

    // Create team
    const team = await prisma.masterTeam.create({
      data: {
        nama: namaTeam.trim(),
        deskripsi: deskripsi?.trim() || null,
        type: 'PRODUCT',
        depId: session.user.departemenId ?? null
      }
    });

    // Process projects
    for (const project of projects || []) {
      if (project.isMerged) {
        // Create project group for merged projects
        const projectGroup = await prisma.projectGroup.create({
          data: {
            nama: project.namaDisplay,
            deskripsi: `Gabungan project: ${project.originalProjects.map((p: any) => p.namaProyek).join(', ')}`,
            teamId: team.id
          }
        });

        // Add projects to the group
        for (const originalProject of project.originalProjects) {
          await prisma.projectGroupItem.create({
            data: {
              groupId: projectGroup.id,
              projectId: originalProject.id
            }
          });
        }
      } else {
        // Assign individual project directly to team
        await prisma.proyek.update({
          where: { id: project.originalProjects[0].id },
          data: { teamId: team.id }
        });
      }
    }

    // Save pegawai members
    if (Array.isArray(pegawaiIds) && pegawaiIds.length > 0) {
      await prisma.masterTeamMember.createMany({
        data: pegawaiIds.map((pegawaiId: number) => ({
          teamId: team.id,
          pegawaiId,
          role: 'member',
        })),
        skipDuplicates: true,
      });
    }

    const result = team;

    return NextResponse.json({
      success: true,
      item: {
        id: result.id,
        noUrut: 0, // Will be calculated in GET request
        namaTeam: result.nama,
        deskripsi: result.deskripsi || '',
        projects: projects || []
      }
    });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create team' },
      { status: 500 }
    );
  }
}