import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/proyek-team/item/[id]
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const item = await prisma.proyekTeam.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('GET proyek-team item error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/proyek-team/item/[id]
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const pegawaiId = Number(body?.pegawaiId);
  const jabatan = String(body?.jabatan || '').trim();
  if (!Number.isFinite(pegawaiId) || !jabatan) return NextResponse.json({ error: 'pegawaiId and jabatan are required' }, { status: 400 });
  try {
    const updated = await prisma.proyekTeam.update({ where: { id }, data: { pegawaiId, jabatan } });
    return NextResponse.json({ item: updated });
  } catch (e) {
    console.error('PUT proyek-team item error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/proyek-team/item/[id]
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    await prisma.proyekTeam.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE proyek-team item error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
