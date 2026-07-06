import { NextRequest, NextResponse } from 'next/server';

/**
 * SSO Redirect Route
 * 
 * This route handles redirects from Portal Hub to Logbook.
 * It simply redirects to the SSO login page which will use the Portal cookie.
 * 
 * Flow:
 * 1. Hub redirects to: /api/auth/sso-redirect
 * 2. This endpoint redirects to: /sso-login
 * 3. SSO login page uses Portal cookie to authenticate
 */
export async function GET(request: NextRequest) {
  try {
    const returnUrl = request.nextUrl.searchParams.get('return_url') || '/project-dashboard';

    console.log('[SSO Redirect] Redirecting to SSO login page');

    // Redirect to SSO login page
    // The Portal cookie will be automatically sent by the browser
    const ssoLoginUrl = new URL('/sso-login', request.url);
    ssoLoginUrl.searchParams.set('return_url', returnUrl);

    return NextResponse.redirect(ssoLoginUrl);
  } catch (error) {
    console.error('[SSO Redirect] Error:', error);
    return NextResponse.redirect(new URL('/signin?error=sso_error', request.url));
  }
}
