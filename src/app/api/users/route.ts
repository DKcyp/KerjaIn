import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/users - Get list of users for assignment
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const role = searchParams.get('role'); // Optional role filter
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') || '50', 10)));

    const where: any = {};
    
    // Search by name or username
    if (q) {
      where.OR = [
        { namaLengkap: { contains: q, mode: 'insensitive' as const } },
        { username: { contains: q, mode: 'insensitive' as const } },
      ];
    }

    // Filter by role if specified
    if (role) {
      where.role = role;
    }

    const [total, items] = await Promise.all([
      prisma.pegawai.count({ where }),
      prisma.pegawai.findMany({
        where,
        select: {
          id: true,
          namaLengkap: true,
          username: true,
          role: true,
        },
        orderBy: { namaLengkap: 'asc' },
        skip: (page - 1) * size,
        take: size,
      })
    ]);

    // Transform to match expected format
    const users = items.map(item => ({
      id: item.id,
      name: item.namaLengkap,
      username: item.username,
      role: item.role,
    }));

    return NextResponse.json({ 
      items: users, 
      total, 
      page, 
      size 
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}