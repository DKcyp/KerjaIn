import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalSession, mapPortalRole, fetchHubDepartment } from '@/lib/portal-sso';
import { prisma } from '@/lib/prisma';
import { signSession, SESSION_COOKIE, getSessionCookieOptionsForRequest } from '@/lib/auth';

/**
 * Portal SSO Authentication Route
 * 
 * This route handles authentication via Richz Portal SSO.
 * It supports both new user creation and linking existing users.
 * 
 * User Linking Strategy:
 * 1. Check if user already linked (ssoUserId matches)
 * 2. Try to find by username (email prefix)
 * 3. Try to find by similar name (fuzzy match)
 * 4. Create new user if no match found
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Portal SSO] Starting authentication flow (POST)');
    
    // Get token from request body
    const body = await request.json();
    const ssoToken = body.token;
    
    if (!ssoToken) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }

    let portalUser: any;
    
    try {
      // Decode token sent by Portal
      const decoded = JSON.parse(Buffer.from(ssoToken, 'base64').toString('utf-8'));
      portalUser = {
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        displayName: `${decoded.firstName} ${decoded.lastName}`,
        role: decoded.role,
        tenant: {
          id: decoded.tenantId,
          name: decoded.tenantName,
          slug: decoded.tenantSlug
        }
      };
      console.log('[Portal SSO] Token decoded successfully:', portalUser.email);
    } catch (err) {
      console.error('[Portal SSO] Failed to decode token:', err);
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Smart user linking: Try multiple strategies to find existing user
    let user = await findOrCreateUser(portalUser);

    console.log('[Portal SSO] User resolved:', {
      id: user.id,
      username: user.username,
      namaLengkap: user.namaLengkap,
      wasLinked: !!user.ssoUserId
    });

    // Create local session using the same pattern as regular login
    const token = signSession({ 
      id: user.id, 
      role: user.role, 
      namaLengkap: user.namaLengkap, 
      username: user.username,
      departemenId: user.departemenId || null,
      ssoEnabled: true // Mark as SSO user for app launcher
    });

    console.log('[Portal SSO] Session created');

    // Create response with redirect
    const response = NextResponse.json({ 
      success: true,
      message: 'Authentication successful'
    });

    // Set local session cookie
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptionsForRequest(request));

    return response;
  } catch (error) {
    console.error('[Portal SSO] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[Portal SSO] Starting authentication flow (GET)');
    
    // Get return URL from query params
    const returnUrl = request.nextUrl.searchParams.get('return_url') || '/project-dashboard';
    
    // Check if token is provided (token-based flow from Portal)
    const ssoToken = request.nextUrl.searchParams.get('token');
    
    let portalUser: any;
    
    if (ssoToken) {
      // Token-based flow: Decode token sent by Portal
      console.log('[Portal SSO] Token-based authentication');
      try {
        const decoded = JSON.parse(Buffer.from(ssoToken, 'base64').toString('utf-8'));
        portalUser = {
          id: decoded.id,
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          displayName: `${decoded.firstName} ${decoded.lastName}`,
          role: decoded.role,
          tenant: {
            id: decoded.tenantId,
            name: decoded.tenantName,
            slug: decoded.tenantSlug
          }
        };
        console.log('[Portal SSO] Token decoded successfully:', portalUser.email);
      } catch (err) {
        console.error('[Portal SSO] Failed to decode token:', err);
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      }
    } else {
      // Cookie-based flow: Verify session with Portal
      const cookieHeader = request.headers.get('cookie') || undefined;
      console.log('[Portal SSO] Cookie-based authentication, verifying session with Portal...');
      
      const portalResponse = await verifyPortalSession(cookieHeader);

      if (!portalResponse.authenticated || !portalResponse.user) {
        console.log('[Portal SSO] Not authenticated with Portal');
        return NextResponse.json(
          { error: 'Not authenticated with Portal', requiresLogin: true },
          { status: 401 }
        );
      }

      portalUser = portalResponse.user;
      console.log('[Portal SSO] Portal user authenticated:', portalUser.email);
    }

    // Smart user linking: Try multiple strategies to find existing user
    let user = await findOrCreateUser(portalUser);

    console.log('[Portal SSO] User resolved:', {
      id: user.id,
      username: user.username,
      namaLengkap: user.namaLengkap,
      wasLinked: !!user.ssoUserId
    });

    // Create local session using the same pattern as regular login
    const token = signSession({ 
      id: user.id, 
      role: user.role, 
      namaLengkap: user.namaLengkap, 
      username: user.username,
      departemenId: user.departemenId || null,
      ssoEnabled: true // Mark as SSO user for app launcher
    });

    console.log('[Portal SSO] Session created');

    // Create redirect response
    const response = NextResponse.redirect(new URL(returnUrl, request.url));

    // Set local session cookie
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptionsForRequest(request));

    return response;
  } catch (error) {
    console.error('[Portal SSO] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Smart user finder with multiple linking strategies
 */
async function findOrCreateUser(portalUser: any) {
  // Resolve department from Portal tenant
  const portalTenantId = portalUser.tenant?.id || portalUser.tenantId || null;
  const portalTenantName = portalUser.tenant?.name || null;
  let departemenId: number | null = null;

  if (portalTenantId) {
    let dept = await prisma.masterDepartemen.findUnique({
      where: { idDep: portalTenantId }
    });
    if (!dept && portalTenantName) {
      console.log('[Portal SSO] Creating department from Portal tenant:', portalTenantName);
      dept = await prisma.masterDepartemen.create({
        data: {
          idDep: portalTenantId,
          nama: portalTenantName,
          isActive: true,
        }
      });
    }
    if (dept) {
      departemenId = dept.id;
      console.log('[Portal SSO] Department resolved:', dept.nama, '(ID:', dept.id, ')');

      // Fetch department logo from Hub if not already stored
      if (!dept.logoUrl) {
        const hubDept = await fetchHubDepartment(portalTenantId);
        if (hubDept?.dep_logo) {
          await prisma.masterDepartemen.update({
            where: { id: dept.id },
            data: { logoUrl: hubDept.dep_logo },
          });
          console.log('[Portal SSO] Logo updated from Hub:', hubDept.dep_logo);
        }
      }
    }
  }

  // Strategy 1: Check if user already linked by ssoUserId
  let user = await prisma.pegawai.findFirst({
    where: { ssoUserId: portalUser.id },
  });

  if (user) {
    console.log('[Portal SSO] Found user by ssoUserId (already linked):', user.id);
    
    // Update SSO fields and department if missing
    user = await prisma.pegawai.update({
      where: { id: user.id },
      data: {
        portalTenantId: portalTenantId,
        ...(departemenId && !user.departemenId ? { departemenId } : {}),
      },
    });
    
    return user;
  }

  // Strategy 2: Try to find by exact username match (Portal email = Logbook username)
  user = await prisma.pegawai.findFirst({
    where: { 
      username: portalUser.email,
    },
  });

  if (user) {
    const isValidUUID = user.ssoUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.ssoUserId);
    const isLinkedToDifferentUser = isValidUUID && user.ssoUserId !== portalUser.id;
    
    if (isLinkedToDifferentUser) {
      console.log('[Portal SSO] User already linked to different Portal user, skipping');
    } else {
      console.log('[Portal SSO] Found existing user by username match, linking:', user.id);
      
      user = await prisma.pegawai.update({
        where: { id: user.id },
        data: {
          ssoUserId: portalUser.id,
          portalTenantId: portalTenantId,
          departemenId: departemenId || user.departemenId,
        },
      });
      
      return user;
    }
  }

  // Strategy 3: Try to find by similar name (fuzzy match)
  const users = await prisma.pegawai.findMany({
    where: {
      ssoUserId: null,
      namaLengkap: {
        contains: portalUser.firstName,
        mode: 'insensitive'
      }
    },
    take: 5
  });

  if (users.length === 1) {
    console.log('[Portal SSO] Found single user by name match, linking:', users[0].id);
    
    user = await prisma.pegawai.update({
      where: { id: users[0].id },
      data: {
        ssoUserId: portalUser.id,
        portalTenantId: portalTenantId,
        departemenId: departemenId || users[0].departemenId,
      },
    });
    
    return user;
  } else if (users.length > 1) {
    console.log('[Portal SSO] Multiple potential matches found, creating new user to avoid conflicts');
  }

  // Strategy 4: Create new user if no match found
  console.log('[Portal SSO] No existing user found, creating new user');
  
  const emailUsername = portalUser.email.split('@')[0];
  
  user = await prisma.pegawai.create({
    data: {
      noUrut: await getNextNoUrut(),
      namaLengkap: portalUser.displayName,
      username: await getUniqueUsername(emailUsername),
      noHp: '',
      passwordHash: '',
      role: mapPortalRole(portalUser.role),
      ssoUserId: portalUser.id,
      portalTenantId: portalTenantId,
      departemenId: departemenId,
    },
  });
  
  console.log('[Portal SSO] New user created:', user.id);
  return user;
}

/**
 * Get unique username by appending number if needed
 */
async function getUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let counter = 1;
  
  while (await prisma.pegawai.findFirst({ where: { username } })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
}

/**
 * Get next noUrut for new user
 */
async function getNextNoUrut(): Promise<number> {
  const lastUser = await prisma.pegawai.findFirst({
    orderBy: { noUrut: 'desc' },
    select: { noUrut: true },
  });
  
  return (lastUser?.noUrut || 0) + 1;
}
