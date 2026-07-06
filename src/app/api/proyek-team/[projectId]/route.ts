import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/proyek-team/[projectId]
export async function GET(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  try {
    const teamMembers = await prisma.proyekTeam.findMany({ 
      where: { projectId }, 
      orderBy: { id: 'asc' } 
    });

    // Get pegawai details for each team member
    const teamWithDetails = await Promise.all(
      teamMembers.map(async (member) => {
        const pegawai = await prisma.pegawai.findUnique({
          where: { id: member.pegawaiId },
          select: {
            id: true,
            namaLengkap: true,
            role: true,
            username: true,
            noHp: true
          }
        });
        return {
          ...member,
          pegawai
        };
      })
    );

    // Also include a simplified pegawai list for dropdown usage
    const pegawaiList = teamWithDetails.map(member => ({
      id: member.pegawaiId,
      namaLengkap: member.pegawai?.namaLengkap || `User #${member.pegawaiId}`
    }));

    return NextResponse.json({ 
      items: teamWithDetails,
      pegawaiList: pegawaiList
    });
  } catch (e) {
    console.error('GET /api/proyek-team/[projectId] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/proyek-team/[projectId]
export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const pegawaiId = Number(body?.pegawaiId);
  const jabatan = String(body?.jabatan || '').trim();
  if (!Number.isFinite(pegawaiId) || !jabatan) return NextResponse.json({ error: 'pegawaiId and jabatan are required' }, { status: 400 });
  try {
    const created = await prisma.proyekTeam.create({ data: { projectId, pegawaiId, jabatan } });
    return NextResponse.json({ item: created });
  } catch (e: any) {
    console.error('POST /api/proyek-team/[projectId] error', e);
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Pegawai already in team' }, { status: 409 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
