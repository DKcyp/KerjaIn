import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Static allowlist + dynamic from ALLOWED_ORIGINS env var
const STATIC_AUTH_ORIGINS = [
  `http://localhost:${process.env.PORT || '3000'}`,
  `http://127.0.0.1:${process.env.PORT || '3000'}`,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_SSO_DASHBOARD_URL,
  process.env.PORTAL_URL,
  process.env.NEXT_PUBLIC_PORTAL_URL,
  'https://hub.richz.id',
  'https://hub-dev.richz.id',
  'https://portal.expressa.id',
  'https://portal-dev.expressa.id',
  'http://192.168.1.6:3000',
  'http://192.168.10.159:3000',
];

// Merge with ALLOWED_ORIGINS env var (comma-separated)
const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const AUTH_ALLOWED_ORIGINS = new Set([...STATIC_AUTH_ORIGINS, ...envOrigins].filter(Boolean) as string[]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only handle CORS for /api/auth/* routes
  if (!pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Handle preflight
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    const response = new NextResponse(null, { status: 204 });
    if (origin && AUTH_ALLOWED_ORIGINS.has(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // For normal requests, reflect origin if allowed
  const origin = request.headers.get('origin');
  const response = NextResponse.next();
  if (origin && AUTH_ALLOWED_ORIGINS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

export const config = {
  matcher: ['/api/auth/:path*'],
};
