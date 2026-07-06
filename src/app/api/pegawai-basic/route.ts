        export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

// GET /api/pegawai-basic -> list basic pegawai info for team management
// This endpoint provides minimal pegawai info without requiring user.read permission
// It's intended for team assignment and project management purposes
export async function GET() {
  try {
    // Check authentication (but not specific permissions)
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only return basic info needed for team management
    const rows = await prisma.pegawai.findMany({ 
      select: {
        id: true,
        namaLengkap: true,
        role: true,
        noHp: true,
        noUrut: true
      },
      orderBy: { noUrut: 'asc' } 
    });
    
    return NextResponse.json({ items: rows });
  } catch (e) {
    console.error('GET /api/pegawai-basic error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
