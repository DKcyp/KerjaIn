import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { refreshSSOToken, isSSOEnabled, SSOError } from '@/lib/sso';

export async function POST(req: NextRequest) {
  // Check if SSO is enabled
  if (!isSSOEnabled()) {
    return NextResponse.json({ error: 'SSO is not enabled' }, { status: 400 });
  }

  try {
    // Get current user from session
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user from database
    const user = await (prisma as any).pegawai.findUnique({ 
      where: { id: session.id },
      select: {
        id: true,
        username: true,
        ssoRefreshToken: true,
        ssoAccessToken: true,
        ssoTokenExpiry: true
      }
    });

    if (!user || !user.ssoRefreshToken) {
      return NextResponse.json({ error: 'No SSO refresh token found' }, { status: 400 });
    }

    // Refresh SSO token
    const ssoResponse = await refreshSSOToken({
      refresh_token: user.ssoRefreshToken
    });

    // Update user with new tokens
    await (prisma as any).pegawai.update({
      where: { id: user.id },
      data: {
        ssoAccessToken: ssoResponse.access_token,
        ssoRefreshToken: ssoResponse.refresh_token,
        ssoTokenExpiry: new Date(Date.now() + ssoResponse.expires_in * 1000),
      }
    });

    return NextResponse.json({
      success: true,
      expires_in: ssoResponse.expires_in
    });

  } catch (error) {
    console.error('POST /api/auth/sso-refresh error:', error);
    
    if (error instanceof SSOError) {
      // Clear SSO tokens from database when refresh fails
      try {
        const cookieHeader = req.headers.get('cookie');
        const session = parseSessionFromCookieHeader(cookieHeader);
        
        if (session) {
          await (prisma as any).pegawai.update({
            where: { id: session.id },
            data: {
              ssoAccessToken: null,
              ssoRefreshToken: null,
              ssoTokenExpiry: null,
            }
          });
        }
      } catch (dbError) {
        console.error('Failed to clear SSO tokens after refresh failure:', dbError);
      }
      
      return NextResponse.json({ 
        error: error.message,
        ssoError: true,
        sessionExpired: true
      }, { status: error.statusCode || 401 });
    }

    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}
