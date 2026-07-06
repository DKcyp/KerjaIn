import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE /api/proyek/[id]/team/[memberId] - Remove member from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const projectId = parseInt(id);
    const pegawaiId = parseInt(memberId);

    await prisma.proyekTeam.delete({
      where: {
        projectId_pegawaiId: {
          projectId,
          pegawaiId,
        },
      },
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing project member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}