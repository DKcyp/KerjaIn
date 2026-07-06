import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/proyek-modules/[projectId]/leaves
// Returns only leaf modules for a project. Optional query: q (search by nama)
export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const wantsSelect2 = (searchParams.get('format') || '').toLowerCase() === 'select2';
  try {
    // Fetch all nodes for project (relational) and build a tree, then collect leaves in DFS order
    type Row = { id: number; nama: string; parentId: number | null; kode?: string | null };
    const rows: Row[] = await prisma.proyekModule.findMany({
      where: { projectId },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { id: 'asc' }],
      select: { id: true, nama: true, parentId: true, kode: true },
    }) as unknown as Row[];
    if (rows.length > 0) {
      // index for path reconstruction
      const byId = new Map<number, Row>(rows.map((r) => [r.id, r]));
      // group by parent
      const byParent = new Map<number | null, Row[]>();
      rows.forEach((r) => {
        const key = r.parentId ?? null;
        const arr = byParent.get(key) || [];
        arr.push(r);
        byParent.set(key, arr);
      });
      // DFS collect leaves following sibling order
      const leaves: Row[] = [];
      const walk = (parentId: number | null) => {
        const level = byParent.get(parentId) || [];
        for (const n of level) {
          const kids = byParent.get(n.id) || [];
          if (kids.length === 0) leaves.push(n);
          else walk(n.id);
        }
      };
      walk(null);
      const filtered: Row[] = q
        ? leaves.filter((r) => {
            const code = (r as any)?.kode ? String((r as any).kode).toLowerCase() : '';
            return r.nama.toLowerCase().includes(q) || code.includes(q);
          })
        : leaves;
      const buildPath = (node: Row): string => {
        const names: string[] = [];
        let cur: Row | undefined | null = node;
        while (cur) {
          names.push(cur.nama);
          cur = cur.parentId != null ? byId.get(cur.parentId) || null : null;
        }
        return names.reverse().join(' / ');
      };
      const items = filtered.map((r) => ({ id: r.id, nama: r.nama, path: buildPath(r), kode: (r as any)?.kode || null }));
      if (wantsSelect2) {
        const results = items.map((it) => ({ id: it.id, text: `${it.kode ? `${it.kode} - ` : ''}${it.path || it.nama}`, disabled: false }));
        return NextResponse.json({ results });
      }
      return NextResponse.json({ items });
    }
    // No relational rows; return empty (do not use legacy proyek_modules)
    if (wantsSelect2) return NextResponse.json({ results: [] });
    return NextResponse.json({ items: [] });
  } catch (e) {
    console.error('GET relational module leaves error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
