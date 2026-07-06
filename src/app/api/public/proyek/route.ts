import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get all active projects (public, no auth required)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const isActive = searchParams.get('isActive');

  const where: any = {};
  
  // Filter by type if provided
  if (type && ['BLUEPRINT', 'DEVELOPMENT', 'SUPPORT', 'CLOSED'].includes(type)) {
    where.type = type;
  }

  // Filter by active status (default: only active projects)
  if (isActive === 'false') {
    where.isActive = false;
  } else if (isActive === 'all') {
    // no filter, show all
  } else {
    where.isActive = true; // default: only active
  }

  const items = await prisma.proyek.findMany({
    where,
    select: {
      id: true,
      noUrut: true,
      kodeProyek: true,
      namaProyek: true,
      client: true,
      pic: true,
      type: true,
      crmId: true,
      idDep: true,
      depNama: true,
      projectNamaCrm: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { noUrut: 'asc' }
  });

  return NextResponse.json({ success: true, items });
}
