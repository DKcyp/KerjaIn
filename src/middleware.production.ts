/**
 * Production Middleware with Automatic SSO
 * 
 * This middleware enables automatic SSO when using subdomains on the same domain.
 * Example: portal.expressa.id and logbook.expressa.id
 * 
 * In production, cookies can be shared across subdomains by setting:
 * COOKIE_DOMAIN=.expressa.id in Portal
 * 
 * This allows the Portal session cookie to be read by Logbook,
 * enabling seamless automatic sign-in without clicking a button.
 * 
 * USAGE:
 * 1. Rename this file to middleware.ts in production
 * 2. Set COOKIE_DOMAIN in Portal .env
 * 3. Deploy both apps to subdomains
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/signin',
  '/login',
  '/signup',
  '/api',
  '/_next',
  '/favicon.ico',
  '/icons',
  '/images',
  '/socket.io',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if user has local Logbook session
  const cookieHeader = request.headers.get('cookie');
  const session = parseSessionFromCookieHeader(cookieHeader);

  // If user has local session, allow access
  if (session) {
    return NextResponse.next();
  }

  // No local session - check if user is authenticated with Portal
  // In production with shared domain, Portal session cookie will be available
  const portalUrl = process.env.PORTAL_URL;
  
  if (!portalUrl) {
    console.warn('[Middleware] PORTAL_URL not configured, cannot verify Portal session');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    // Forward cookies to Portal to check authentication
    // In production, this will include the shared Portal session cookie
    const portalResponse = await fetch(`${portalUrl}/api/sso/verify`, {
      headers: {
        cookie: cookieHeader || '',
      },
      cache: 'no-store',
    });

    if (portalResponse.ok) {
      const data = await portalResponse.json();
      
      // User is authenticated with Portal - redirect to SSO flow
      if (data.authenticated) {
        console.log('[Middleware] User authenticated with Portal, auto-signing in');
        const ssoUrl = new URL('/api/auth/portal-sso', request.url);
        ssoUrl.searchParams.set('return_url', pathname);
        return NextResponse.redirect(ssoUrl);
      }
    }
  } catch (error) {
    console.error('[Middleware] Error checking Portal auth:', error);
  }

  // Not authenticated with Portal - redirect to signin
  const loginUrl = new URL('/signin', request.url);
  loginUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
