import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapPortalRole } from '@/lib/portal-sso';

/**
 * External API for Portal to sync users to Logbook
 * 
 * Authentication: API Key in header
 * Usage: Portal calls this when creating/updating users
 */

function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.LOGBOOK_API_KEY;
  
  if (!expectedKey) {
    console.error('[User API] LOGBOOK_API_KEY not configured');
    return false;
  }
  
  return apiKey === expectedKey;
}

/**
 * GET /api/external/users
 * List all SSO users in logbook
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const portalTenantId = searchParams.get('portalTenantId');

    const where: any = {
      ssoUserId: { not: null } // Only SSO users
    };

    if (portalTenantId) {
      where.portalTenantId = portalTenantId;
    }

    const users = await prisma.pegawai.findMany({
      where,
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        noHp: true,
        role: true,
        ssoUserId: true,
        portalTenantId: true,
        departemenId: true,
        departemen: {
          select: {
            id: true,
            idDep: true,
            nama: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { namaLengkap: 'asc' }
    });

    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.namaLengkap,
        phone: u.noHp,
        role: u.role,
        ssoUserId: u.ssoUserId,
        portalTenantId: u.portalTenantId,
        departmentId: u.departemenId,
        department: u.departemen ? {
          id: u.departemen.id,
          portalTenantId: u.departemen.idDep,
          name: u.departemen.nama,
        } : null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }))
    });
  } catch (error) {
    console.error('[User API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/external/users
 * Create or update a user from Portal
 * 
 * Supports two payload formats:
 * 1. Direct: { ssoUserId, portalTenantId, email, firstName, lastName, role, phone }
 * 2. Webhook: { event, data: { ssoUserId, ... }, timestamp }
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Support both direct payload and webhook payload format
    const payload = body.event ? body.data : body;
    const { ssoUserId, portalTenantId, email, firstName, lastName, role, phone } = payload;

    if (!ssoUserId || !portalTenantId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields: ssoUserId, portalTenantId, email, firstName, lastName' },
        { status: 400 }
      );
    }

    // Find the department (tenant) in logbook
    const department = await prisma.masterDepartemen.findUnique({
      where: { idDep: portalTenantId }
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Tenant not found in logbook. Please sync tenant first.' },
        { status: 404 }
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const logbookRole = mapPortalRole(role);

    // Check if user already exists by ssoUserId
    const existing = await prisma.pegawai.findFirst({
      where: { ssoUserId }
    });

    let user;
    if (existing) {
      // Update existing user
      user = await prisma.pegawai.update({
        where: { id: existing.id },
        data: {
          portalTenantId,
          departemenId: department.id,
          updatedAt: new Date(),
        }
      });
      
      console.log('[User API] Updated user:', user.id);
    } else {
      // Create new user
      const lastUser = await prisma.pegawai.findFirst({
        orderBy: { noUrut: 'desc' },
        select: { noUrut: true },
      });
      const nextNoUrut = (lastUser?.noUrut || 0) + 1;

      // Generate unique username
      let username = email;
      let counter = 1;
      while (await prisma.pegawai.findFirst({ where: { username } })) {
        username = `${email.split('@')[0]}${counter}`;
        counter++;
      }

      user = await prisma.pegawai.create({
        data: {
          noUrut: nextNoUrut,
          namaLengkap: fullName,
          username,
          noHp: phone || '',
          passwordHash: '', // No password for SSO users
          role: logbookRole,
          ssoUserId,
          portalTenantId,
          departemenId: department.id,
        }
      });
      
      console.log('[User API] Created user:', user.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.namaLengkap,
        role: user.role,
        ssoUserId: user.ssoUserId,
        portalTenantId: user.portalTenantId,
        departmentId: user.departemenId,
      }
    });
  } catch (error) {
    console.error('[User API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
