import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/master/team - Get all teams with hierarchy
export async function GET() {
  try {
    const teams = await prisma.masterTeam.findMany({
      where: { parentId: null }, // Get root teams only
      include: {
        members: {
          include: {
            pegawai: {
              select: {
                id: true,
                namaLengkap: true,
              },
            },
          },
        },
        projectGroups: {
          include: {
            projects: {
              include: {
                project: {
                  select: {
                    id: true,
                    namaProyek: true,
                    kodeProyek: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        projects: true,
        subTeams: {
          include: {
            members: {
              include: {
                pegawai: {
                  select: {
                    id: true,
                    namaLengkap: true,
                  },
                },
              },
            },
            projectGroups: {
              include: {
                projects: {
                  include: {
                    project: {
                      select: {
                        id: true,
                        namaProyek: true,
                        kodeProyek: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
            projects: true,
            _count: {
              select: {
                members: true,
                projects: true,
                subTeams: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
            subTeams: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get all project IDs to fetch their team members
    const allProjectIds = teams.flatMap((team: any) => [
      ...team.projects.map((p: any) => p.id),
      ...team.subTeams.flatMap((sub: any) => sub.projects.map((p: any) => p.id))
    ]);

    // Fetch project team members for all projects
    const projectTeamMembers = allProjectIds.length > 0 ? await prisma.proyekTeam.findMany({
      where: {
        projectId: { in: allProjectIds }
      },
      include: {
        pegawai: {
          select: {
            id: true,
            namaLengkap: true,
          },
        },
      },
    }) : [];

    // Group project members by projectId
    const projectMembersMap = projectTeamMembers.reduce((acc: any, member: any) => {
      if (!acc[member.projectId]) {
        acc[member.projectId] = [];
      }
      acc[member.projectId].push({
        id: member.pegawai.id,
        nama: member.pegawai.namaLengkap,
        role: member.jabatan,
      });
      return acc;
    }, {});

    // Transform data to match frontend structure
    const transformedTeams = teams.map((team: any) => ({
      id: team.id,
      nama: team.nama,
      deskripsi: team.deskripsi,
      type: team.type,
      parentId: team.parentId,
      isActive: team.isActive,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
      _count: team._count,
      members: team.members.map((m: any) => ({
        id: m.pegawai.id,
        nama: m.pegawai.namaLengkap,
        role: m.role,
      })),
      assignedProjects: team.projects.map((p: any) => ({
        id: p.id,
        namaProyek: p.namaProyek,
        kodeProyek: p.kodeProyek,
        client: p.client,
        members: projectMembersMap[p.id] || [],
      })),
      projects: team.projectGroups.map((g: any) => ({
        id: g.id,
        nama: g.nama,
        deskripsi: g.deskripsi,
        teamId: g.teamId,
        isActive: g.isActive,
        projects: g.projects.map((p: any) => ({
          id: p.project.id,
          namaProyek: p.project.namaProyek,
          kodeProyek: p.project.kodeProyek,
          isActive: p.project.isActive,
        })),
        _count: { projects: g.projects.length },
      })),
      subTeams: team.subTeams.map((sub: any) => ({
        id: sub.id,
        nama: sub.nama,
        deskripsi: sub.deskripsi,
        type: sub.type,
        parentId: team.id,
        isActive: sub.isActive,
        createdAt: sub.createdAt.toISOString(),
        updatedAt: sub.updatedAt.toISOString(),
        _count: sub._count,
        parent: { id: team.id, nama: team.nama },
        members: sub.members.map((m: any) => ({
          id: m.pegawai.id,
          nama: m.pegawai.namaLengkap,
          role: m.role,
        })),
        assignedProjects: sub.projects.map((p: any) => ({
          id: p.id,
          namaProyek: p.namaProyek,
          kodeProyek: p.kodeProyek,
          client: p.client,
          members: projectMembersMap[p.id] || [],
        })),
        projects: sub.projectGroups.map((g: any) => ({
          id: g.id,
          nama: g.nama,
          deskripsi: g.deskripsi,
          teamId: g.teamId,
          isActive: g.isActive,
          projects: g.projects.map((p: any) => ({
            id: p.project.id,
            namaProyek: p.project.namaProyek,
            kodeProyek: p.project.kodeProyek,
            isActive: p.project.isActive,
          })),
          _count: { projects: g.projects.length },
        })),
      })),
    }));

    return NextResponse.json(transformedTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

// POST /api/master/team - Create new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, deskripsi, type, parentId, isActive } = body;

    if (!nama || !type) {
      return NextResponse.json({ error: 'Nama and type are required' }, { status: 400 });
    }

    const team = await prisma.masterTeam.create({
      data: {
        nama,
        deskripsi,
        type,
        parentId,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
