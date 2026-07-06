import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getSSOSessionInfo, ensureValidSSOSession } from '@/lib/sso-session';
import { isSSOEnabled } from '@/lib/sso';

export async function GET(request: NextRequest) {
  try {
    // Check if SSO is enabled
    if (!isSSOEnabled()) {
      return NextResponse.json({
        ssoEnabled: false,
        hasSession: false,
        message: 'SSO is not enabled'
      });
    }

    // Get current user session
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json({
        ssoEnabled: true,
        hasSession: false,
        message: 'Not authenticated'
      }, { status: 401 });
    }

    // Get SSO session info
    const ssoInfo = await getSSOSessionInfo(user.id);
    
    // Check if session is valid and refresh if needed
    const sessionCheck = await ensureValidSSOSession(user.id);

    return NextResponse.json({
      ssoEnabled: true,
      hasSession: true,
      userId: user.id,
      username: user.username,
      sso: {
        hasSSO: ssoInfo.hasSSO,
        isValid: sessionCheck.isValid,
        needsRefresh: sessionCheck.needsRefresh,
        expiresAt: ssoInfo.expiresAt,
        expiresIn: ssoInfo.expiresIn,
        error: sessionCheck.error
      }
    });

  } catch (error) {
    console.error('Error getting SSO status:', error);
    return NextResponse.json({
      ssoEnabled: true,
      hasSession: false,
      error: 'Failed to get SSO status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action !== 'refresh') {
      return NextResponse.json({
        error: 'Invalid action. Only "refresh" is supported.'
      }, { status: 400 });
    }

    // Check if SSO is enabled
    if (!isSSOEnabled()) {
      return NextResponse.json({
        error: 'SSO is not enabled'
      }, { status: 400 });
    }

    // Get current user session
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json({
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Force refresh SSO token
    const sessionCheck = await ensureValidSSOSession(user.id);
    
    if (sessionCheck.isValid) {
      return NextResponse.json({
        success: true,
        message: 'SSO session refreshed successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: sessionCheck.error || 'Failed to refresh SSO session',
        forceLogout: true
      }, { status: 401 });
    }

  } catch (error) {
    console.error('Error refreshing SSO session:', error);
    return NextResponse.json({
      error: 'Failed to refresh SSO session'
    }, { status: 500 });
  }
}
