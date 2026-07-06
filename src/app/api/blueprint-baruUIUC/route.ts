import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logBacaraActivity, extractRequestInfo } from '@/lib/bacaraLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);

  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const baId = searchParams.get('baId');

    if (!baId) {
      return NextResponse.json({ success: false, error: 'baId is required' }, { status: 400 });
    }

    const entries = await prisma.bADetailRfc.findMany({
      where: { baId: parseInt(baId) },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error('Error fetching RFC entries:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);

  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { baId, moduleId, keterangan, gambar } = body;

    if (!baId || !moduleId) {
      return NextResponse.json({ success: false, error: 'baId and moduleId are required' }, { status: 400 });
    }

    const entry = await prisma.bADetailRfc.create({
      data: {
        baId: parseInt(baId),
        moduleId: parseInt(moduleId),
        keterangan: keterangan || null,
        gambar: gambar || null,
        createdBy: 1,
      },
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error creating RFC entry:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
