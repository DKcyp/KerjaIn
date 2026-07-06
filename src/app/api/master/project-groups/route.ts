import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/master/project-groups - Create project group
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, deskripsi, teamId, projectIds } = body;

    if (!nama || !teamId || !projectIds || projectIds.length === 0) {
      return NextResponse.json(
        { error: 'Nama, teamId, and projectIds are required' },
        { status: 400 }
      );
    }

    // Create project group with items
    const projectGroup = await prisma.projectGroup.create({
      data: {
        nama,
        deskripsi,
        teamId,
        projects: {
          create: projectIds.map((projectId: number) => ({
            projectId,
          })),
        },
      },
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
    });

    return NextResponse.json(projectGroup, { status: 201 });
  } catch (error) {
    console.error('Error creating project group:', error);
    return NextResponse.json({ error: 'Failed to create project group' }, { status: 500 });
  }
}
