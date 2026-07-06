import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// PUT /api/proyek-modules/[projectId]/reorder
// Body: { nodeId: number, direction: 'up' | 'down' }
// Behavior: swaps ONLY the kode between the node and its adjacent sibling
// in the same parent group, then returns ok. Sorting is driven by kode.
export async function PUT(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const nodeId = Number(body?.nodeId);
  const direction = body?.direction === 'up' ? 'up' : body?.direction === 'down' ? 'down' : null;
  if (!Number.isFinite(nodeId) || !direction) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // serialize per project
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${projectId})`;

      const node = await tx.proyekModule.findFirst({ where: { id: nodeId } });
      if (!node) {
        // return 404 by throwing a tagged error
        throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' as const });
      }
      if (node.projectId !== projectId) {
        // wrong URL project vs node owner
        throw Object.assign(new Error('PROJECT_MISMATCH'), { code: 'PROJECT_MISMATCH' as const });
      }
      const parentId = node.parentId ?? null;

      // load siblings under same parent (no explicit ordering)
      const siblings = await tx.proyekModule.findMany({
        where: { projectId: node.projectId, parentId },
      });
      const pad2 = (n: number) => String(n).padStart(2, '0');

      // determine prefix based on parent kode (if any)
      let prefix = '';
      if (parentId != null) {
        const parent = await tx.proyekModule.findFirst({ where: { id: parentId, projectId } });
        const parentKode = parent?.kode ?? '';
        prefix = parentKode ? String(parentKode) + '.' : '';
      }

      // derive current position from node.kode last segment
      const kodeStr = String(node.kode ?? '');
      const lastSegStr = kodeStr.includes('.') ? kodeStr.split('.').pop()! : kodeStr;
      const curIdx = Number.parseInt(lastSegStr, 10);
      if (!Number.isFinite(curIdx) || curIdx <= 0) return; // cannot determine position
      const targetIdx = direction === 'up' ? curIdx - 1 : curIdx + 1;
      if (targetIdx <= 0) return; // boundary

      const targetKode = `${prefix}${pad2(targetIdx)}`;
      const target = siblings.find((s) => String(s.kode ?? '') === targetKode);
      if (!target) return; // boundary or gap

      // swap only two kodes
      await tx.proyekModule.update({ where: { id: node.id }, data: { kode: targetKode } });
      await tx.proyekModule.update({ where: { id: target.id }, data: { kode: kodeStr } });
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'NOT_FOUND') return NextResponse.json({ error: 'Node tidak ditemukan' }, { status: 404 });
    if (e?.code === 'PROJECT_MISMATCH') return NextResponse.json({ error: 'Node bukan milik project pada URL' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
