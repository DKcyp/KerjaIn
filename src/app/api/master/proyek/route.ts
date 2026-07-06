import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/master/proyek - Get all active projects for selection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const projects = await prisma.proyek.findMany({
      where: {
        isActive: true,
        ...(search ? {
          OR: [
            { namaProyek: { contains: search, mode: 'insensitive' } },
            { kodeProyek: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: {
        id: true,
        namaProyek: true,
        kodeProyek: true,
        client: true,
        teamId: true,
      },
      orderBy: { namaProyek: 'asc' },
      take: 100,
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}