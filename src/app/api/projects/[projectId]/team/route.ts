import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/projects/[projectId]/team - Get team members for a specific project
export async function GET(
  _req: NextRequest, 
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId: projectIdParam } = await params;
    const projectId = parseInt(projectIdParam);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Get all team members for the project (no role filtering)
    const where: any = { projectId };

    // Get team members
    const teamMembers = await prisma.proyekTeam.findMany({
      where,
      orderBy: { id: 'asc' }
    });

    // Get pegawai details for each team member
    const teamWithDetails = await Promise.all(
      teamMembers.map(async (member) => {
        const pegawai = await prisma.pegawai.findUnique({
          where: { id: member.pegawaiId },
          select: {
            id: true,
            namaLengkap: true,
            username: true,
            role: true,
          }
        });
        return {
          ...member,
          pegawai
        };
      })
    );

    // Transform to match expected format
    const users = teamWithDetails
      .filter(member => member.pegawai) // Ensure pegawai exists
      .map(member => ({
        id: member.pegawai!.id,
        name: member.pegawai!.namaLengkap,
        username: member.pegawai!.username,
        role: member.pegawai!.role,
        jabatan: member.jabatan, // Project-specific role
      }));

    return NextResponse.json({ 
      items: users,
      total: users.length,
      projectId
    });
  } catch (error) {
    console.error('GET /api/projects/[projectId]/team error:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}