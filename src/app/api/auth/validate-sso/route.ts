import { NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSSOEnabled, isSSOBypassEnabled, validateSSOToken } from '@/lib/sso';

/**
 * Manual SSO validation endpoint for testing
 * This endpoint immediately validates the SSO token without waiting for intervals
 */
export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json(
        { valid: false, reason: 'No session found' },
        { status: 401 }
      );
    }
    
    const user = await (prisma as any).pegawai.findUnique({ 
      where: { id: session.id } as any 
    });
    
    if (!user) {
      return NextResponse.json(
        { valid: false, reason: 'User not found' },
        { status: 401 }
      );
    }

    // Check SSO status
    if (!isSSOEnabled()) {
      return NextResponse.json({
        valid: true,
        reason: 'SSO disabled',
        ssoEnabled: false
      });
    }

    if (isSSOBypassEnabled()) {
      return NextResponse.json({
        valid: true,
        reason: 'SSO bypass enabled for development',
        ssoEnabled: true,
        bypassEnabled: true
      });
    }

    if (!user.ssoAccessToken) {
      return NextResponse.json({
        valid: false,
        reason: 'No SSO token found',
        ssoEnabled: true,
        hasToken: false
      });
    }

    // Validate SSO token immediately
    console.log(`[SSO] Manual validation for user ${user.id}`);
    console.log(`[SSO] Token to validate: ${user.ssoAccessToken?.substring(0, 20)}...`);
    
    const isTokenValid = await validateSSOToken(user.ssoAccessToken);
    console.log(`[SSO] Validation result: ${isTokenValid}`);
    
    if (!isTokenValid) {
      // Clear SSO tokens from database
      await (prisma as any).pegawai.update({
        where: { id: user.id },
        data: {
          ssoAccessToken: null,
          ssoRefreshToken: null,
          ssoTokenExpiry: null,
        }
      });
      
      return NextResponse.json({
        valid: false,
        reason: 'SSO token is invalid',
        ssoEnabled: true,
        hasToken: false,
        tokenCleared: true
      }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      reason: 'SSO token is valid',
      ssoEnabled: true,
      hasToken: true,
      lastValidation: user.ssoTokenExpiry,
      tokenPreview: user.ssoAccessToken?.substring(0, 20) + '...'
    });

  } catch (error) {
    console.error('SSO validation error:', error);
    return NextResponse.json(
      { 
        valid: false, 
        reason: 'Validation failed', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
