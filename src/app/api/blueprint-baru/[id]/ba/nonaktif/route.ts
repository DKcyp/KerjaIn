import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await req.json();
    const { baId, isNonaktif, idBlueprintBaru } = body;

    if (!baId || typeof isNonaktif !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'baId (number) dan isNonaktif (boolean) wajib diisi' },
        { status: 400 }
      );
    }

    const data: any = { isNonaktif };
    if (idBlueprintBaru !== undefined) {
      data.idBlueprintBaru = idBlueprintBaru;
    }

    const ba = await prisma.bacara.update({
      where: { id: baId },
      data,
    });

    return NextResponse.json({ success: true, data: ba });
  } catch (error) {
    console.error('Error updating BA nonaktif status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
