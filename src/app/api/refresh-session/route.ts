import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader, signSession, getSessionCookieOptionsForRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'No session found'
      }, { status: 401 });
    }

    // Get current user from database
    const user = await (prisma as any).pegawai.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        departemenId: true
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Create new session with current database role
    const newSession = {
      id: user.id,
      role: user.role,
      namaLengkap: user.namaLengkap,
      username: user.username,
      departemenId: user.departemenId || null
    };

    const newToken = signSession(newSession);
    const cookieOptions = getSessionCookieOptionsForRequest(req);

    const response = NextResponse.json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        oldSession: session,
        newSession,
        roleMismatch: session.role !== user.role
      }
    });

    response.cookies.set('session', newToken, cookieOptions);

    return response;

  } catch (error) {
    console.error('Refresh session error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
