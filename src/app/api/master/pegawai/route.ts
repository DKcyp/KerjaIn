import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/master/pegawai - Get all pegawai for selection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const pegawai = await prisma.pegawai.findMany({
      where: search ? {
        OR: [
          { namaLengkap: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      } : {},
      select: {
        id: true,
        namaLengkap: true,
        username: true,
        role: true,
      },
      orderBy: { namaLengkap: 'asc' },
      take: 50, // Limit results
    });

    return NextResponse.json(pegawai);
  } catch (error) {
    console.error('Error fetching pegawai:', error);
    return NextResponse.json({ error: 'Failed to fetch pegawai' }, { status: 500 });
  }
}