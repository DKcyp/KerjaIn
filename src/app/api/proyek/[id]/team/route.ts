import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/proyek/[id]/team - Add members to project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { members } = body;

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'Members array is required' }, { status: 400 });
    }

    // Create project team members
    const createdMembers = await prisma.proyekTeam.createMany({
      data: members.map((member: any) => ({
        projectId,
        pegawaiId: member.pegawaiId,
        jabatan: member.jabatan,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ 
      message: 'Members added successfully',
      count: createdMembers.count 
    });
  } catch (error) {
    console.error('Error adding project members:', error);
    return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
  }
}