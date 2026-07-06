import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/master/team/[id]/projects - Assign projects to team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id);
    const body = await request.json();
    const { projectIds } = body; // Array of project IDs

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: 'Project IDs array is required' }, { status: 400 });
    }

    // Update projects to assign them to this team
    const updatedProjects = await prisma.proyek.updateMany({
      where: {
        id: { in: projectIds },
      },
      data: {
        teamId,
      },
    });

    return NextResponse.json({ 
      message: `${updatedProjects.count} projects assigned successfully`,
      count: updatedProjects.count 
    });
  } catch (error) {
    console.error('Error assigning projects:', error);
    return NextResponse.json({ error: 'Failed to assign projects' }, { status: 500 });
  }
}

// DELETE /api/master/team/[id]/projects - Unassign project from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    await prisma.proyek.update({
      where: { id: parseInt(projectId) },
      data: { teamId: null },
    });

    return NextResponse.json({ message: 'Project unassigned successfully' });
  } catch (error) {
    console.error('Error unassigning project:', error);
    return NextResponse.json({ error: 'Failed to unassign project' }, { status: 500 });
  }
}