import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { validateSSOToken } from '@/lib/sso';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get current user from session
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false, 
        ssoValid: false,
        reason: 'No session found'
      });
    }

    // Get user from database
    const user = await (prisma as any).pegawai.findUnique({ 
      where: { id: session.id },
      select: {
        id: true,
        username: true,
        ssoAccessToken: true,
        ssoRefreshToken: true,
        ssoTokenExpiry: true
      }
    });

    if (!user) {
      return NextResponse.json({ 
        authenticated: false, 
        ssoValid: false,
        reason: 'User not found'
      });
    }

    // Check if SSO token is still valid
    if (user.ssoAccessToken) {
      const isValid = await validateSSOToken(user.ssoAccessToken);
      
      return NextResponse.json({
        authenticated: true,
        ssoValid: isValid,
        expiresAt: user.ssoTokenExpiry,
        expiresIn: user.ssoTokenExpiry ? Math.max(0, Math.floor((new Date(user.ssoTokenExpiry).getTime() - Date.now()) / 1000)) : null
      });
    }

    return NextResponse.json({ 
      authenticated: true, 
      ssoValid: false,
      reason: 'No SSO token'
    });

  } catch (error) {
    console.error('SSO check error:', error);
    return NextResponse.json({ 
      authenticated: false, 
      ssoValid: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
