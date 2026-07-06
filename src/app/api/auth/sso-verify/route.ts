import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSSO, isSSOEnabled } from '@/lib/sso';

/**
 * SSO Token Verification Endpoint
 * GET /api/auth/sso-verify
 * 
 * Verifies SSO access token and returns user info if valid
 * Requires Authorization: Bearer <token> header
 */
export async function GET(req: NextRequest) {
  try {
    if (!isSSOEnabled()) {
      return NextResponse.json(
        { valid: false, error: 'SSO is not enabled' },
        { status: 400 }
      );
    }

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!accessToken) {
      return NextResponse.json(
        { valid: false, error: 'Access token is required' },
        { status: 401 }
      );
    }

    // Verify token with SSO server
    const ssoUserProfile = await getUserFromSSO(accessToken);
    
    return NextResponse.json({
      valid: true,
      user: ssoUserProfile
    });

  } catch (error) {
    console.error('SSO token verification failed:', error);
    
    return NextResponse.json(
      { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Token verification failed' 
      },
      { status: 401 }
    );
  }
}
