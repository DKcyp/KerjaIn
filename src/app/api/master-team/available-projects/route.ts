import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

// Ensure connection is closed properly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// GET /api/master-team/available-projects - Get all available projects
export async function GET() {
  try {
    const projects = await prisma.proyek.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        kodeProyek: true,
        namaProyek: true,
        teamId: true
      },
      orderBy: {
        kodeProyek: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      items: projects
    });
  } catch (error) {
    console.error('Error fetching available projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available projects' },
      { status: 500 }
    );
  }
}