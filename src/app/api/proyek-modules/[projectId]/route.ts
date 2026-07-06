import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/proyek-modules/[projectId]
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }
  try {
    // Legacy proyek_modules storage removed; return empty for compatibility
    return NextResponse.json({ modules: [] });
  } catch (e: any) {
    console.error('GET proyek-modules error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/proyek-modules/[projectId]
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ projectId: string }> }
) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) {
    return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const modules = Array.isArray(body?.modules) ? body.modules : [];
  try {
    // Legacy proyek_modules storage removed; reject updates and direct clients to use relational endpoints
    return NextResponse.json({
      error: 'Legacy proyek_modules telah dihapus. Gunakan endpoint relasional /api/proyek-modules/[projectId]/tree untuk membaca/atur struktur modul.',
    }, { status: 409 });
  } catch (e: any) {
    console.error('PUT proyek-modules error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

