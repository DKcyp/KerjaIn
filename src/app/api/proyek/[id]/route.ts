import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/proyek/[id]
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  
  try {
    if (Number.isFinite(id)) {
      // Try to find by unique numeric ID first
      const item = await prisma.proyek.findUnique({ where: { id } });
      if (item) return NextResponse.json({ item });
    }
    
    // Fallback: search by crmId
    const itemByCrm = await prisma.proyek.findFirst({ where: { crmId: idStr } });
    if (itemByCrm) return NextResponse.json({ item: itemByCrm });

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('GET /api/proyek/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/proyek/[id]
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const kodeProyek = String(body?.kodeProyek || '').trim();
  const namaProyek = String(body?.namaProyek || '').trim();
  const crmId = body?.crmId ? String(body.crmId).trim() : null;
  const idDep = body?.idDep ? String(body.idDep).trim() : null;
  const depNama = body?.depNama ? String(body.depNama).trim() : null;
  const projectNamaCrm = body?.projectNamaCrm ? String(body.projectNamaCrm).trim() : null;
  const type = body?.type;
  const teamId = body?.teamId !== undefined ? (body.teamId ? Number(body.teamId) : null) : undefined;
  const idDeployment = body?.idDeployment !== undefined ? (body.idDeployment ? String(body.idDeployment).trim() : null) : undefined;

  // If only teamId is being updated (for team assignment)
  if (teamId !== undefined && !kodeProyek && !namaProyek) {
    try {
      const updated = await prisma.proyek.update({ 
        where: { id }, 
        data: teamId === null ? { team: { disconnect: true } } : { team: { connect: { id: teamId } } }
      });
      return NextResponse.json({ item: updated });
    } catch (e: any) {
      console.error('PUT /api/proyek/[id] teamId update error', e);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  if (!kodeProyek || !namaProyek) {
    return NextResponse.json({ error: 'kodeProyek and namaProyek are required' }, { status: 400 });
  }

  // Validate type if provided
  if (type) {
    const validTypes = ['BLUEPRINT', 'DEVELOPMENT', 'SUPPORT', 'CLOSED'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid project type' }, { status: 400 });
    }
  }

  try {
    const updateData: any = { kodeProyek, namaProyek, crmId, idDep, depNama, projectNamaCrm };
    if (type) updateData.type = type;
    
    if (teamId !== undefined) {
      if (teamId === null) {
        updateData.team = { disconnect: true };
      } else {
        updateData.team = { connect: { id: teamId } };
      }
    }
    
    if (idDeployment !== undefined) updateData.idDeployment = idDeployment;

    const updated = await prisma.proyek.update({ where: { id }, data: updateData });
    return NextResponse.json({ item: updated });
  } catch (e: any) {
    console.error('PUT /api/proyek/[id] error', e);
    if (e?.code === 'P2002') return NextResponse.json({ error: 'kodeProyek must be unique' }, { status: 409 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/proyek/[id]
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    await prisma.proyek.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/proyek/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
