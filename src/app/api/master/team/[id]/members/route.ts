import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/master/team/[id]/members - Add team members
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id);
    const body = await request.json();
    const { members } = body; // Array of { pegawaiId, role }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'Members array is required' }, { status: 400 });
    }

    // Create team members
    const createdMembers = await prisma.masterTeamMember.createMany({
      data: members.map((member: any) => ({
        teamId,
        pegawaiId: member.pegawaiId,
        role: member.role,
      })),
      skipDuplicates: true, // Skip if already exists
    });

    return NextResponse.json({ 
      message: `${createdMembers.count} members added successfully`,
      count: createdMembers.count 
    });
  } catch (error) {
    console.error('Error adding team members:', error);
    return NextResponse.json({ error: 'Failed to add team members' }, { status: 500 });
  }
}

// DELETE /api/master/team/[id]/members - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const pegawaiId = searchParams.get('pegawaiId');

    if (!pegawaiId) {
      return NextResponse.json({ error: 'pegawaiId is required' }, { status: 400 });
    }

    await prisma.masterTeamMember.delete({
      where: {
        teamId_pegawaiId: {
          teamId,
          pegawaiId: parseInt(pegawaiId),
        },
      },
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}