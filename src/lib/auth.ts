import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

export const SESSION_COOKIE = 'session';
const DEFAULT_SECRET = 'dev-secret-change-me';

export type SessionPayload = {
  id: number;
  role: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN';
  namaLengkap?: string | null;
  username?: string | null;
  departemenId?: number | null;
  permissions?: string[];
  ssoEnabled?: boolean;
  iat?: number;
  exp?: number;
};

export type AuthUser = {
  id: number;
  role: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN';
  namaLengkap?: string | null;
  username?: string | null;
  departemenId?: number | null;
  permissions?: string[];
};

function getSecret() {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

export function signSession(payload: Omit<SessionPayload, 'iat' | 'exp'>, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + maxAgeSeconds;
  const body = { ...payload, iat, exp } as SessionPayload;
  const json = JSON.stringify(body);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifySession(token?: string | null): SessionPayload | null {
  try {
    if (!token) return null;
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const json = Buffer.from(b64, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as SessionPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: maxAgeSeconds,
  };
}

// Prefer this when you have access to NextRequest to ensure cookie secure flag
// matches the actual protocol (HTTP vs HTTPS). This avoids losing cookies on
// localhost when running in production mode over HTTP.
export function getSessionCookieOptionsForRequest(req: NextRequest, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
  const cookieDomain = process.env.COOKIE_DOMAIN;

  console.log('🍪 Cookie Debug:', {
    protocol: req.nextUrl.protocol,
    forwardedProto: req.headers.get('x-forwarded-proto'),
    host: req.headers.get('host'),
    isHttps,
    domain: cookieDomain,
    userAgent: req.headers.get('user-agent')?.substring(0, 50)
  });

  const options: any = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    path: '/',
    secure: isHttps,
    maxAge: maxAgeSeconds,
  };

  // Add domain only for HTTPS (production) — never for localhost
  const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1');
  if (cookieDomain && isHttps && !isLocalhost) {
    options.domain = cookieDomain;
  }

  return options;
}

/**
 * Validate static API key for mobile apps
 * Maps API keys to user sessions without requiring login
 */
function validateStaticApiKey(apiKey: string): SessionPayload | null {
  // Define static API keys for mobile apps
  // Format: 'key': { userId, role, name }
  const STATIC_API_KEYS: Record<string, { id: number; role: 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN'; namaLengkap: string }> = {
    'pm-key-2024': { 
      id: 1, 
      role: 'PM', 
      namaLengkap: 'PM Mobile User' 
    },
    'admin-key-2024': { 
      id: 1, 
      role: 'SUPER_ADMIN', 
      namaLengkap: 'Admin Mobile User' 
    },
    'programmer-key-2024': { 
      id: 2, 
      role: 'PROGRAMMER', 
      namaLengkap: 'Programmer Mobile User' 
    },
    // Key lama untuk backward compatibility
    '172dc4710ab54af8b1b405c89d6de9f0': {
      id: 1,
      role: 'PM',
      namaLengkap: 'External API User'
    },
  };

  const userConfig = STATIC_API_KEYS[apiKey];
  if (userConfig) {
    console.log('✅ [AUTH] Valid static API key found:', apiKey);
    return {
      id: userConfig.id,
      role: userConfig.role,
      namaLengkap: userConfig.namaLengkap,
      username: `mobile_${userConfig.role.toLowerCase()}`,
    };
  }

  return null;
}

export function parseSessionFromCookieHeader(cookieHeader: string | null | undefined): SessionPayload | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  const kv = parts.map((p) => p.split('=' as any));
  const entry = kv.find(([k]) => k === SESSION_COOKIE);
  const token = entry?.[1];
  
  // First try to verify as JWT token
  const jwtSession = verifySession(token);
  if (jwtSession) return jwtSession;
  
  // If JWT verification fails, try as static API key
  if (token) {
    const apiKeySession = validateStaticApiKey(token);
    if (apiKeySession) {
      console.log('✅ [AUTH] Cookie contains valid static API key');
      return apiKeySession;
    }
  }
  
  return null;
}

/**
 * Parse session from multiple authentication methods
 * Supports: Cookie session, Bearer token, API Key header, Mobile token
 */
export function parseSessionFromRequest(req: Request): SessionPayload | null {
  console.log('🔍 [AUTH] Checking multiple authentication methods...');
  
  // Method 1: Cookie session (existing)
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    console.log('🔍 [AUTH] Trying Cookie session...');
    const session = parseSessionFromCookieHeader(cookieHeader);
    if (session) {
      console.log('✅ [AUTH] Success via Cookie session');
      return session;
    }
  }

  // Method 2: Bearer token
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('🔍 [AUTH] Trying Bearer token...');
    const token = authHeader.substring(7);
    const session = verifySession(token);
    if (session) {
      console.log('✅ [AUTH] Success via Bearer token');
      return session;
    }
  }

  // Method 3: X-API-Key header (try JWT first, then static API key)
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) {
    console.log('🔍 [AUTH] Trying X-API-Key...');
    // Try as JWT token first
    const jwtSession = verifySession(apiKey);
    if (jwtSession) {
      console.log('✅ [AUTH] Success via X-API-Key (JWT)');
      return jwtSession;
    }
    // Try as static API key
    const staticSession = validateStaticApiKey(apiKey);
    if (staticSession) {
      console.log('✅ [AUTH] Success via X-API-Key (Static)');
      return staticSession;
    }
  }

  // Method 4: Custom headers for mobile app
  const mobileToken = req.headers.get('x-mobile-token') || req.headers.get('x-session-token');
  if (mobileToken) {
    console.log('🔍 [AUTH] Trying Mobile token...');
    const session = verifySession(mobileToken);
    if (session) {
      console.log('✅ [AUTH] Success via Mobile token');
      return session;
    }
  }

  console.log('❌ [AUTH] No valid authentication found');
  console.log('🔍 [AUTH] Headers received:', {
    cookie: cookieHeader ? 'present' : 'missing',
    authorization: authHeader ? 'present' : 'missing',
    'x-api-key': apiKey ? 'present' : 'missing',
    'x-mobile-token': mobileToken ? 'present' : 'missing',
  });
  
  return null;
}

// Hash password using scrypt, returns format: scrypt$N$r$p$hexSalt$hexKey
export function hashPassword(password: string): string {
  const N = 16384, r = 8, p = 1, keyLen = 64;
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, keyLen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${key.toString('hex')}`;
}

// Supports multiple hash formats:
//   scrypt$N$r$p$hexSalt$hexKey  (native)
//   $2a$ / $2b$ (bcrypt, from legacy external DB)
//   32-char hex (MD5, from legacy external DB)
export function verifyPassword(password: string, passwordHash: string | null | undefined) {
  try {
    if (!passwordHash) return false;

    // Try scrypt (native format)
    const parts = passwordHash.split('$');
    if (parts.length === 6 && parts[0] === 'scrypt') {
      const N = parseInt(parts[1], 10);
      const r = parseInt(parts[2], 10);
      const p = parseInt(parts[3], 10);
      const salt = Buffer.from(parts[4], 'hex');
      const key = Buffer.from(parts[5], 'hex');
      const derived = crypto.scryptSync(password, salt, key.length, { N, r, p });
      return crypto.timingSafeEqual(key, derived);
    }

    // Try bcrypt (from legacy external DB)
    if (passwordHash.startsWith('$2')) {
      const bcrypt = require('bcrypt');
      return bcrypt.compareSync(password, passwordHash);
    }

    // Try MD5 (from legacy external DB)
    if (/^[0-9a-f]{32}$/i.test(passwordHash)) {
      const md5 = crypto.createHash('md5').update(password).digest('hex');
      return md5.toLowerCase() === passwordHash.toLowerCase();
    }

    return false;
  } catch {
    return false;
  }
}

// RBAC Utilities
import { prisma } from '@/lib/prisma';

/**
 * Get server session from cookies
 */
export async function getServerSession(): Promise<{ user: AuthUser | null }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);
    const session = verifySession(sessionCookie?.value);

    if (!session) {
      return { user: null };
    }

    // Get user with permissions if not already cached in session
    if (!session.permissions) {
      const userPermissions = await getUserPermissions(session.id);
      return {
        user: {
          id: session.id,
          role: session.role,
          namaLengkap: session.namaLengkap,
          username: session.username,
          departemenId: session.departemenId,
          permissions: userPermissions
        }
      };
    }

    return {
      user: {
        id: session.id,
        role: session.role,
        namaLengkap: session.namaLengkap,
        username: session.username,
        departemenId: session.departemenId,
        permissions: session.permissions
      }
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return { user: null };
  }
}

/**
 * Get user's effective permissions (from roles + direct permissions)
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    // Get user's roles
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    // Get direct user permissions (overrides)
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true
      }
    });

    // Calculate effective permissions
    const effectivePermissions = new Map<string, boolean>();

    // Add role-based permissions
    userRoles.forEach((ur) => {
      if (ur.role.isActive) {
        ur.role.rolePermissions.forEach((rp) => {
          if (rp.permission.isActive) {
            effectivePermissions.set(rp.permission.name, true);
          }
        });
      }
    });

    // Apply user-specific overrides
    userPermissions.forEach((up) => {
      if (up.permission.isActive) {
        effectivePermissions.set(up.permission.name, up.granted);
      }
    });

    // Return only granted permissions
    return Array.from(effectivePermissions.entries())
      .filter(([_, granted]) => granted)
      .map(([permission, _]) => permission)
      .sort();
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId);
    return permissions.includes(permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(userId: number, permissions: string[]): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userId);
    return permissions.some(permission => userPermissions.includes(permission));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(userId: number, permissions: string[]): Promise<boolean> {
  try {
    const userPermissions = await getUserPermissions(userId);
    return permissions.every(permission => userPermissions.includes(permission));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
}

/**
 * Middleware to check permissions in API routes
 */
export function requirePermission(permission: string) {
  return async (userId: number): Promise<boolean> => {
    return await hasPermission(userId, permission);
  };
}

/**
 * Middleware to check any of multiple permissions in API routes
 */
export function requireAnyPermission(permissions: string[]) {
  return async (userId: number): Promise<boolean> => {
    return await hasAnyPermission(userId, permissions);
  };
}

/**
 * Middleware to check all permissions in API routes
 */
export function requireAllPermissions(permissions: string[]) {
  return async (userId: number): Promise<boolean> => {
    return await hasAllPermissions(userId, permissions);
  };
}
