import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/proyek/crm/[crmId]
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ crmId: string }> }
) {
  try {
    const { crmId } = await ctx.params;
    if (!crmId) {
      return NextResponse.json({ error: 'crmId is required' }, { status: 400 });
    }

    const item = await prisma.proyek.findFirst({
      where: { crmId: crmId }
    });

    if (!item) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (e) {
    console.error('GET /api/proyek/crm/[crmId] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
