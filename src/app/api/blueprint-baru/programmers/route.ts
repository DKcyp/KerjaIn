import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get all users with PROGRAMMER role or users who are in project teams
    const programmers = await prisma.pegawai.findMany({
      where: {
        OR: [
          { role: 'PROGRAMMER' },
          { role: 'ADMIN' },
          { role: 'PM' },
          { role: 'SUPER_ADMIN' }
        ]
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
      data: programmers
    });

  } catch (error) {
    console.error('Error fetching programmers:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}