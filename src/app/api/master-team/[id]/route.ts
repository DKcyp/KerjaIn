import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

// Ensure connection is closed properly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// PUT /api/master-team/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const teamId = parseInt(resolvedParams.id);
    const body = await request.json();
    const { namaTeam, deskripsi, projects, pegawaiIds } = body;

    if (!namaTeam?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama tim harus diisi' },
        { status: 400 }
      );
    }

    // Check if team exists
    const existingTeam = await prisma.masterTeam.findUnique({
      where: { id: teamId }
    });

    if (!existingTeam) {
      return NextResponse.json(
        { success: false, error: 'Tim tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if team name already exists (excluding current team)
    const duplicateTeam = await prisma.masterTeam.findFirst({
      where: {
        nama: namaTeam.trim(),
        isActive: true,
        id: { not: teamId }
      }
    });

    if (duplicateTeam) {
      return NextResponse.json(
        { success: false, error: 'Nama tim sudah digunakan' },
        { status: 400 }
      );
    }

    // Update team basic info first
    const team = await prisma.masterTeam.update({
      where: { id: teamId },
      data: {
        nama: namaTeam.trim(),
        deskripsi: deskripsi?.trim() || null
      }
    });

    // Remove all existing project assignments and groups
    await prisma.proyek.updateMany({
      where: { teamId: teamId },
      data: { teamId: null }
    });

    await prisma.projectGroup.updateMany({
      where: { teamId: teamId },
      data: { isActive: false }
    });

    // Process new projects
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

    // Sync pegawai: delete all existing members, insert new ones
    await prisma.masterTeamMember.deleteMany({ where: { teamId: team.id } });
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
    console.error('Error updating team:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

// DELETE /api/master-team/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const teamId = parseInt(resolvedParams.id);

    // Check if team exists
    const existingTeam = await prisma.masterTeam.findUnique({
      where: { id: teamId }
    });

    if (!existingTeam) {
      return NextResponse.json(
        { success: false, error: 'Tim tidak ditemukan' },
        { status: 404 }
      );
    }

    // Remove project assignments
    await prisma.proyek.updateMany({
      where: { teamId: teamId },
      data: { teamId: null }
    });

    // Deactivate project groups
    await prisma.projectGroup.updateMany({
      where: { teamId: teamId },
      data: { isActive: false }
    });

    // Remove all team members
    await prisma.masterTeamMember.deleteMany({ where: { teamId: teamId } });

    // Soft delete team
    await prisma.masterTeam.update({
      where: { id: teamId },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Tim berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}