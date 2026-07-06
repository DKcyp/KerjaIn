import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const baId = searchParams.get('baId');

    if (!baId) {
      return NextResponse.json({ success: false, error: 'baId is required' }, { status: 400 });
    }

    const revisions = await prisma.bATask.findMany({
      where: {
        module: {
          baId: parseInt(baId),
        },
        revisiKeterangan: { not: null },
      },
      include: {
        module: {
          select: {
            id: true,
            nama: true,
            level: true,
            parentId: true,
          },
        },
        programmer: {
          select: {
            namaLengkap: true,
          },
        },
      },
      orderBy: { revisiAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: revisions });
  } catch (error) {
    console.error('Error fetching UAT revisions:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}