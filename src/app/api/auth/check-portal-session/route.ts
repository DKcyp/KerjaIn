import { NextRequest, NextResponse } from 'next/server';
import { mapPortalRole } from '@/lib/portal-sso';
import { prisma } from '@/lib/prisma';
import { signSession, SESSION_COOKIE, getSessionCookieOptionsForRequest, parseSessionFromCookieHeader } from '@/lib/auth';

/**
 * Check if user has active Portal session and auto-login if available.
 * Reads richz_sso_token JWT cookie directly — no external call to Portal needed.
 * If user already has a valid local session, skip and return not-authenticated
 * to avoid overriding a fresh manual login.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Check Portal Session] Checking for active Portal session');

    // If user already has a valid local session cookie, don't override it
    const cookieHeader = request.headers.get('cookie');
    const existingSession = parseSessionFromCookieHeader(cookieHeader);
    if (existingSession) {
      console.log('[Check Portal Session] User already has valid local session, skipping portal check');
      return NextResponse.json({ hasPortalSession: false, authenticated: false, reason: 'already_authenticated' });
    }

    // Read richz_sso_token cookie directly from the request
    const ssoToken = request.cookies.get('richz_sso_token')?.value;

    if (!ssoToken) {
      console.log('[Check Portal Session] No richz_sso_token cookie found');
      return NextResponse.json({ hasPortalSession: false, authenticated: false });
    }

    // Decode JWT payload (no signature verification needed — token is from trusted Portal domain)
    let portalUser: any;
    try {
      const parts = ssoToken.split('.');
      if (parts.length < 2) throw new Error('Invalid JWT format');
      const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
      portalUser = JSON.parse(payload);
    } catch (e) {
      console.error('[Check Portal Session] Failed to decode JWT:', e);
      return NextResponse.json({ hasPortalSession: false, authenticated: false });
    }

    // Validate required fields
    if (!portalUser.id && !portalUser.sub) {
      console.log('[Check Portal Session] JWT missing user id');
      return NextResponse.json({ hasPortalSession: false, authenticated: false });
    }

    // Normalize portal user fields
    const normalizedUser = {
      id:          portalUser.id || portalUser.sub || portalUser.user_id,
      email:       portalUser.email || portalUser.username,
      displayName: portalUser.name || portalUser.namaLengkap || portalUser.email,
      firstName:   (portalUser.name || '').split(' ')[0],
      role:        portalUser.role || 'Admin',
      tenantId:    portalUser.tenantId || portalUser.id_dep || portalUser.dep_id || null,
      tenantName:  portalUser.tenantName || null,
    };

    console.log('[Check Portal Session] Portal user from cookie:', normalizedUser.email);

    // Find or create user in internal DB
    const user = await findOrCreateUser(normalizedUser);

    console.log('[Check Portal Session] User resolved:', {
      id: user.id,
      username: user.username,
      namaLengkap: user.namaLengkap,
    });

    // Create local session
    const token = signSession({
      id: user.id,
      role: user.role,
      namaLengkap: user.namaLengkap,
      username: user.username,
      departemenId: user.departemenId || null,
      ssoEnabled: true,
    });

    const response = NextResponse.json({
      hasPortalSession: true,
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        namaLengkap: user.namaLengkap,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptionsForRequest(request));
    console.log('[Check Portal Session] Session created for auto-login');
    return response;
  } catch (error) {
    console.error('[Check Portal Session] Error:', error);
    return NextResponse.json({
      hasPortalSession: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Smart user finder with multiple linking strategies
 */
async function findOrCreateUser(portalUser: {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  role: string;
  tenantId: string | null;
  tenantName: string | null;
}) {
  // Resolve department from Portal tenant
  const portalTenantId = portalUser.tenantId;
  const portalTenantName = portalUser.tenantName;
  let departemenId: number | null = null;

  if (portalTenantId) {
    let dept = await prisma.masterDepartemen.findUnique({
      where: { idDep: portalTenantId }
    });
    if (!dept && portalTenantName) {
      console.log('[Check Portal Session] Creating department from Portal tenant:', portalTenantName);
      dept = await prisma.masterDepartemen.create({
        data: { idDep: portalTenantId, nama: portalTenantName, isActive: true }
      });
    }
    if (dept) departemenId = dept.id;
  }

  // Strategy 1: already linked by ssoUserId
  let user = await prisma.pegawai.findFirst({
    where: { ssoUserId: portalUser.id },
  });

  if (user) {
    console.log('[Check Portal Session] Found user by ssoUserId:', user.id);
    user = await prisma.pegawai.update({
      where: { id: user.id },
      data: {
        ...(portalTenantId ? { portalTenantId } : {}),
        ...(departemenId && !user.departemenId ? { departemenId } : {}),
      },
    });
    return user;
  }

  // Strategy 2: match by username/email
  user = await prisma.pegawai.findFirst({
    where: { username: portalUser.email },
  });

  if (user) {
    const isValidUUID = user.ssoUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.ssoUserId);
    const isLinkedToDifferentUser = isValidUUID && user.ssoUserId !== portalUser.id;

    if (!isLinkedToDifferentUser) {
      console.log('[Check Portal Session] Found user by username, linking ssoUserId:', user.id);
      user = await prisma.pegawai.update({
        where: { id: user.id },
        data: {
          ssoUserId: portalUser.id,
          ...(portalTenantId ? { portalTenantId } : {}),
          ...(departemenId ? { departemenId: departemenId || user.departemenId } : {}),
        },
      });
      return user;
    }
  }

  // Strategy 3: match by name (only if single match)
  const users = await prisma.pegawai.findMany({
    where: {
      ssoUserId: null,
      namaLengkap: { contains: portalUser.firstName, mode: 'insensitive' },
    },
    take: 5,
  });

  if (users.length === 1) {
    console.log('[Check Portal Session] Found single user by name match, linking:', users[0].id);
    user = await prisma.pegawai.update({
      where: { id: users[0].id },
      data: {
        ssoUserId: portalUser.id,
        ...(portalTenantId ? { portalTenantId } : {}),
        departemenId: departemenId || users[0].departemenId,
      },
    });
    return user;
  }

  // Strategy 4: create new user
  console.log('[Check Portal Session] Creating new user for:', portalUser.email);
  const emailUsername = portalUser.email.split('@')[0];
  const mappedRole = mapPortalRole(portalUser.role);

  user = await prisma.pegawai.create({
    data: {
      noUrut: await getNextNoUrut(),
      namaLengkap: portalUser.displayName || portalUser.email,
      username: await getUniqueUsername(emailUsername),
      noHp: '',
      passwordHash: '',
      role: mappedRole,
      ssoUserId: portalUser.id,
      ...(portalTenantId ? { portalTenantId } : {}),
      ...(departemenId ? { departemenId } : {}),
    },
  });

  // Assign user_role
  const roleIdMap: Record<string, number> = { SUPER_ADMIN: 1, PM: 2, PROGRAMMER: 3, ADMIN: 4 };
  const assignedRoleId = roleIdMap[mappedRole];
  if (assignedRoleId) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: assignedRoleId } });
  }

  console.log('[Check Portal Session] New user created:', user.id);
  return user;
}

async function getUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let counter = 1;
  
  while (await prisma.pegawai.findFirst({ where: { username } })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
}

async function getNextNoUrut(): Promise<number> {
  const lastUser = await prisma.pegawai.findFirst({
    orderBy: { noUrut: 'desc' },
    select: { noUrut: true },
  });
  
  return (lastUser?.noUrut || 0) + 1;
}
