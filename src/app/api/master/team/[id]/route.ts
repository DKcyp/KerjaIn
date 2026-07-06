import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/master/team/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { nama, deskripsi, type, parentId, isActive } = body;

    const team = await prisma.masterTeam.update({
      where: { id },
      data: {
        nama,
        deskripsi,
        type,
        parentId,
        isActive,
      },
    });

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

// DELETE /api/master/team/[id] - Delete team
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    // Check if team has sub-teams
    const subTeamsCount = await prisma.masterTeam.count({
      where: { parentId: id },
    });

    if (subTeamsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete team with sub-teams' },
        { status: 400 }
      );
    }

    await prisma.masterTeam.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
