import { NextRequest, NextResponse } from 'next/server';
import { signSession, SESSION_COOKIE, getSessionCookieOptionsForRequest } from '@/lib/auth';
import { getLocalUser, verifyLocalPassword } from '@/lib/externalAuth';

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');

  if (!username || !password) {
    return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
  }

  try {
    // 1. Find user in local DB
    const user = await getLocalUser(username);

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // 2. Verify password against local hash (scrypt)
    if (!verifyLocalPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // 3. Create session
    const token = signSession({
      id: user.id,
      role: user.role as any,
      namaLengkap: user.namaLengkap,
      username: user.username,
      departemenId: user.departemenId,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        noUrut: user.noUrut,
        username: user.username,
        namaLengkap: user.namaLengkap,
        noHp: user.noHp,
        role: user.role,
        departemenId: user.departemenId,
      },
      authMethod: 'local',
    });
    res.cookies.set(SESSION_COOKIE, token, getSessionCookieOptionsForRequest(req));

    return res;
  } catch (e) {
    console.error(`[LOGIN-${requestId}] Unexpected error:`, e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

