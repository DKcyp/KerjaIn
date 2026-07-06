import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient({
  log: ['query', 'error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * GET /api/master-team/debug-teams
 * Debug endpoint to check PM's team membership and programmers
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, id: userId, name } = session.user;

    // Get current user info
    const currentUser = await prisma.pegawai.findUnique({
      where: { id: userId },
      select: {
        id: true,
        namaLengkap: true,
        role: true
      }
    });

    // Get all teams where this user is a member
    const userTeams = await prisma.masterTeamMember.findMany({
      where: {
        pegawaiId: userId
      },
      include: {
        team: {
          select: {
            id: true,
            nama: true,
            isActive: true
          }
        }
      }
    });

    // Get all team members from user's teams
    const teamIds = userTeams.map(t => t.teamId);
    const allTeamMembers = await prisma.masterTeamMember.findMany({
      where: {
        teamId: {
          in: teamIds
        }
      },
      include: {
        pegawai: {
          select: {
            id: true,
            namaLengkap: true,
            role: true
          }
        },
        team: {
          select: {
            id: true,
            nama: true
          }
        }
      }
    });

    // Get all active teams
    const allTeams = await prisma.masterTeam.findMany({
      where: {
        isActive: true
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
        }
      }
    });

    return NextResponse.json({
      success: true,
      debug: {
        currentUser,
        userTeams: userTeams.map(ut => ({
          teamId: ut.teamId,
          teamName: ut.team.nama,
          teamIsActive: ut.team.isActive,
          memberRole: ut.role
        })),
        teamIds,
        allTeamMembers: allTeamMembers.map(tm => ({
          teamId: tm.teamId,
          teamName: tm.team.nama,
          pegawaiId: tm.pegawaiId,
          pegawaiName: tm.pegawai.namaLengkap,
          pegawaiRole: tm.pegawai.role
        })),
        programmersInMyTeams: allTeamMembers
          .filter(tm => tm.pegawai.role === 'PROGRAMMER')
          .map(tm => ({
            id: tm.pegawai.id,
            name: tm.pegawai.namaLengkap,
            team: tm.team.nama
          })),
        allTeamsInSystem: allTeams.map(t => ({
          id: t.id,
          name: t.nama,
          memberCount: t.members.length,
          members: t.members.map(m => ({
            id: m.pegawai.id,
            name: m.pegawai.namaLengkap,
            role: m.pegawai.role
          }))
        }))
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug info', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
