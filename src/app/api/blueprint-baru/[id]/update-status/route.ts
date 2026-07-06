import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENGAJUAN'],
  PENGAJUAN: ['REVIEW'],
  REVIEW: ['RFC', 'CED'],
  RFC: ['PENGAJUAN'],
  CED: ['DEVELOPMENT'],
  DEVELOPMENT: ['PROSES_DEVELOPMENT'],
  PROSES_DEVELOPMENT: ['UAT_INTERNAL'],
  UAT_INTERNAL: [],
  UAT_INTERNAL_SELESAI: ['UAT_EXTERNAL'],
  UAT_EXTERNAL: [],
  UAT_EXTERNAL_SELESAI: ['SELESAI'],
  SELESAI: []
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const baId = parseInt(id);
    const { status } = await req.json();

    if (!status) {
      return NextResponse.json({ success: false, error: 'Status required' }, { status: 400 });
    }

    const ba = await prisma.bacara.findUnique({ where: { id: baId } });
    if (!ba) {
      return NextResponse.json({ success: false, error: 'BA not found' }, { status: 404 });
    }

    const currentStatus = ba.status as string;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowedTransitions.join(', ')}`
      }, { status: 400 });
    }

    const updated = await prisma.bacara.update({
      where: { id: baId },
      data: {
        status,
        ...(status === 'PENGAJUAN' ? { submittedAt: new Date() } : {}),
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating BA status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update status' }, { status: 500 });
  }
}
