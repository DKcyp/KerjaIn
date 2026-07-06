import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS Configuration
 * Restrict API access to authorized origins only
 */

const DEFAULT_ORIGINS = [
  'https://hub.richz.id',
  'https://log-trial.richz.id',
  'https://log.richz.id',
  'https://log.expressa.id',
];

const ALLOWED_ORIGINS: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-API-Key',
  'X-Session-Token',
  'X-Mobile-Token',
];

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
    response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  return response;
}

/**
 * Handle CORS preflight requests
 */
export function handleCORSPreflight(request: NextRequest): NextResponse | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const origin = request.headers.get('origin');

  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  const response = new NextResponse(null, { status: 200 });
  return addCORSHeaders(response, origin);
}

/**
 * Middleware to add CORS headers to all API responses
 */
export function withCORS(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight
    const preflightResponse = handleCORSPreflight(request);
    if (preflightResponse) {
      return preflightResponse;
    }

    // Get response from handler
    const response = await handler(request);

    // Add CORS headers
    const origin = request.headers.get('origin');
    return addCORSHeaders(response, origin);
  };
}
