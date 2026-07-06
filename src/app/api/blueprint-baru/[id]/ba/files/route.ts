import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const baId = searchParams.get('baId');
    const type = searchParams.get('type');

    if (!baId) {
      return NextResponse.json({ success: false, error: 'BA ID required' }, { status: 400 });
    }

    const where: any = { baId: parseInt(baId) };
    if (type) {
      where.type = type;
    }

    const files = await prisma.bADoc.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            namaLengkap: true,
          }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: files });
  } catch (error) {
    console.error('Error fetching BA files:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch files' }, { status: 500 });
  }
}