export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { getServerSession, hasPermission } from '@/lib/auth';

// GET /api/pegawai -> list all
export async function GET() {
  try {
    // Check authentication and permissions
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPermission(session.user.id, 'user.read'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const rows = await prisma.pegawai.findMany({ orderBy: { noUrut: 'asc' } });
    const safe = rows.map((r: any) => {
      const { passwordHash, ...rest } = r || {};
      return rest;
    });
    return NextResponse.json({ items: safe });
  } catch (e) {
    console.error('GET /api/pegawai error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/pegawai -> create with next noUrut
export async function POST(req: Request) {
  try {
    // Check authentication and permissions
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPermission(session.user.id, 'user.create'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const namaLengkap = String(body?.namaLengkap || '').trim();
    const noHp = String(body?.noHp || '').trim();
    const usernameRaw = body?.username;
    const passwordRaw = body?.password;
    const username = usernameRaw == null ? null : String(usernameRaw).trim() || null;
    const password = passwordRaw == null ? null : String(passwordRaw);
    const roleRaw = body?.role;
    const roleStr = roleRaw == null ? 'ADMIN' : String(roleRaw).trim().toUpperCase();
    const allowedRoles = new Set(['SUPER_ADMIN', 'PM', 'PROGRAMMER', 'ADMIN']);
    const role = allowedRoles.has(roleStr) ? roleStr : 'ADMIN';
    
    if (!namaLengkap || !noHp) {
      return NextResponse.json({ error: 'namaLengkap and noHp are required' }, { status: 400 });
    }
    const max = await prisma.pegawai.aggregate({ _max: { noUrut: true } });
    const nextNoUrut = (max._max.noUrut || 0) + 1;
    // if username provided, ensure uniqueness pre-emptively
    if (username) {
      const existing = await (prisma as any).pegawai.findFirst({ where: { username } as any });
      if (existing) return NextResponse.json({ error: 'username already exists' }, { status: 409 });
    }

    let passwordHash: string | null = null;
    if (username && password) {
      // hash with scrypt and random salt
      const salt = crypto.randomBytes(16);
      const keylen = 64;
      const N = 16384, r = 8, p = 1; // scrypt params
      const derivedKey = crypto.scryptSync(password, salt, keylen, { N, r, p });
      passwordHash = `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
    }

    const created = await (prisma as any).pegawai.create({
      data: { namaLengkap, noHp, noUrut: nextNoUrut, username, passwordHash, role } as any,
    });
    const { passwordHash: _ph, ...safe } = (created as any) || {};
    return NextResponse.json({ item: safe });
  } catch (e) {
    console.error('POST /api/pegawai error', e);
    const code = (e as any)?.code;
    if (code === 'P2002') {
      // Unique constraint failed
      return NextResponse.json({ error: 'username already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
