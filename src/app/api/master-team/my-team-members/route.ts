import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient({
  log: ['error'],
});

// Ensure connection is closed properly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * GET /api/master-team/my-team-members
 * Get team members for the current PM based on master_team
 * 
 * For PM: Returns programmers from teams where the PM is a member
 * For SUPER_ADMIN: Returns all programmers
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, id: userId } = session.user;

    console.log(`[my-team-members] User role: ${role}, User ID: ${userId}`);

    // Super Admin gets all programmers
    if (role === 'SUPER_ADMIN') {
      const allProgrammers = await prisma.pegawai.findMany({
        where: {
          role: 'PROGRAMMER'
        },
        select: {
          id: true,
          namaLengkap: true,
          role: true
        },
        orderBy: {
          namaLengkap: 'asc'
        }
      });

      return NextResponse.json({
        success: true,
        items: allProgrammers.map(p => ({
          id: p.id,
          name: p.namaLengkap
        }))
      });
    }

    // PM gets only their team members from master_team
    if (role === 'PM') {
      // Find all teams where this PM is a member
      const pmTeams = await prisma.masterTeamMember.findMany({
        where: {
          pegawaiId: userId,
          team: {
            isActive: true
          }
        },
        select: {
          teamId: true
        }
      });

      const teamIds = pmTeams.map(t => t.teamId);

      console.log(`[my-team-members] PM found in ${pmTeams.length} teams:`, teamIds);

      if (teamIds.length === 0) {
        // PM is not in any team, return empty array
        return NextResponse.json({
          success: true,
          items: [],
          message: 'PM tidak terdaftar di tim manapun'
        });
      }

      // Get all team members from those teams
      const teamMembers = await prisma.masterTeamMember.findMany({
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
          }
        }
      });

      // Filter programmers in application code
      const programmers = teamMembers.filter(
        tm => tm.pegawai.role === 'PROGRAMMER'
      );

      // Remove duplicates (in case a programmer is in multiple teams)
      const uniqueProgrammers = Array.from(
        new Map(
          programmers.map(tm => [tm.pegawai.id, tm.pegawai])
        ).values()
      );

      console.log(`[my-team-members] Found ${uniqueProgrammers.length} unique programmers in PM's teams`);

      return NextResponse.json({
        success: true,
        items: uniqueProgrammers.map(p => ({
          id: p.id,
          name: p.namaLengkap
        }))
      });
    }

    // Other roles don't have access to team members
    return NextResponse.json(
      { success: false, error: 'Unauthorized role' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
