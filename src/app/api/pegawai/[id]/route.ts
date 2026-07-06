import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// GET /api/pegawai/[id]
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const item = await prisma.pegawai.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { passwordHash, ...safe } = (item as any) || {};
    return NextResponse.json({ item: safe });
  } catch (e) {
    console.error('GET /api/pegawai/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/pegawai/[id]
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const namaLengkap = String(body?.namaLengkap || '').trim();
  const noHp = String(body?.noHp || '').trim();
  const usernameRaw = body?.username;
  const passwordRaw = body?.password;
  const roleRaw = body?.role;
  const username = usernameRaw == null ? undefined : (String(usernameRaw).trim() || null);
  const password = passwordRaw == null ? undefined : String(passwordRaw);
  const allowedRoles = new Set(['SUPER_ADMIN', 'PM', 'PROGRAMMER', 'ADMIN']);
  const role = roleRaw == null ? undefined : (allowedRoles.has(String(roleRaw).trim().toUpperCase()) ? String(roleRaw).trim().toUpperCase() : undefined);
  if (!namaLengkap || !noHp) return NextResponse.json({ error: 'namaLengkap and noHp are required' }, { status: 400 });
  try {
    if (username) {
      const existing = await (prisma as any).pegawai.findFirst({ where: { username } as any });
      if (existing && existing.id !== id) return NextResponse.json({ error: 'username already exists' }, { status: 409 });
    }
    let passwordHash: string | undefined;
    if (password && username) {
      const salt = crypto.randomBytes(16);
      const keylen = 64;
      const N = 16384, r = 8, p = 1;
      const derivedKey = crypto.scryptSync(password, salt, keylen, { N, r, p });
      passwordHash = `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
    }

    const data: any = { namaLengkap, noHp };
    if (username !== undefined) data.username = username;
    if (passwordHash !== undefined) data.passwordHash = passwordHash;
    if (role !== undefined) data.role = role;
    const updated = await (prisma as any).pegawai.update({ where: { id }, data });
    const { passwordHash: _ph, ...safe } = (updated as any) || {};
    return NextResponse.json({ item: safe });
  } catch (e) {
    console.error('PUT /api/pegawai/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/pegawai/[id]
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    await prisma.pegawai.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/pegawai/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
