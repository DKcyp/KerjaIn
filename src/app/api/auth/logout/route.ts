import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, getSessionCookieOptionsForRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const opts = getSessionCookieOptionsForRequest(req);
  res.cookies.set(SESSION_COOKIE, '', { ...opts, maxAge: 0 });
  return res;
}
