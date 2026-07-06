import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapPortalRole } from '@/lib/portal-sso';

/**
 * External API for Portal to bulk-create tenants and users in Logbook
 *
 * POST /api/external/bulk
 *
 * Creates a tenant (MasterDepartemen) and multiple users (Pegawai) in one request.
 * Uses partial success — if one user fails, others continue processing.
 *
 * Authentication: API Key in header (x-api-key)
 */

function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.LOGBOOK_API_KEY;

  if (!expectedKey) {
    console.error('[Bulk API] LOGBOOK_API_KEY not configured');
    return false;
  }

  return apiKey === expectedKey;
}

interface BulkDepartemenPayload {
  portalTenantId: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

interface BulkUserPayload {
  ssoUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  phone?: string;
}

interface BulkPayload {
  departemen: BulkDepartemenPayload;
  users: BulkUserPayload[];
}

interface UserResult {
  ssoUserId: string;
  email: string;
  status: 'created' | 'updated' | 'skipped';
  userId?: number;
  error?: string;
}

/**
 * POST /api/external/bulk
 * Bulk-create tenant + users
 *
 * Direct payload:
 *   { departemen: { portalTenantId, name, description?, isActive? }, users: [{ ssoUserId, email, firstName, lastName, role?, phone? }] }
 *
 * Webhook payload:
 *   { event, data: { departemen: {...}, users: [...] }, timestamp }
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
    const payload: BulkPayload = body.event ? body.data : body;

    const { departemen, users } = payload;

    // --- Validate tenant payload ---
    if (!departemen || !departemen.portalTenantId || !departemen.name) {
      return NextResponse.json(
        { error: 'Missing required fields: departemen.portalTenantId, departemen.name' },
        { status: 400 }
      );
    }

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty users array' },
        { status: 400 }
      );
    }

    // --- Upsert tenant ---
    const existingTenant = await prisma.masterDepartemen.findUnique({
      where: { idDep: departemen.portalTenantId },
    });

    let tenant;
    let tenantCreated = false;

    if (existingTenant) {
      tenant = await prisma.masterDepartemen.update({
        where: { idDep: departemen.portalTenantId },
        data: {
          nama: departemen.name,
          deskripsi: departemen.description,
          isActive: departemen.isActive ?? true,
          updatedAt: new Date(),
        },
      });
    } else {
      tenant = await prisma.masterDepartemen.create({
        data: {
          idDep: departemen.portalTenantId,
          nama: departemen.name,
          deskripsi: departemen.description,
          isActive: departemen.isActive ?? true,
        },
      });
      tenantCreated = true;
    }

    console.log(`[Bulk API] Tenant ${tenantCreated ? 'created' : 'updated'}:`, tenant.id);

    // --- Process users sequentially ---
    const results: UserResult[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Validate required user fields
      if (!user.ssoUserId || !user.email || !user.firstName || !user.lastName) {
        results.push({
          ssoUserId: user.ssoUserId || 'unknown',
          email: user.email || 'unknown',
          status: 'skipped',
          error: 'Missing required fields: ssoUserId, email, firstName, lastName',
        });
        skippedCount++;
        continue;
      }

      try {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        const logbookRole = mapPortalRole(user.role || '');

        // Check if user already exists by ssoUserId
        const existingUser = await prisma.pegawai.findFirst({
          where: { ssoUserId: user.ssoUserId },
        });

        if (existingUser) {
          // Update existing user — link to tenant
          const updated = await prisma.pegawai.update({
            where: { id: existingUser.id },
            data: {
              portalTenantId: departemen.portalTenantId,
              departemenId: tenant.id,
              updatedAt: new Date(),
            },
          });

          results.push({
            ssoUserId: user.ssoUserId,
            email: user.email,
            status: 'updated',
            userId: updated.id,
          });
          updatedCount++;
          console.log(`[Bulk API] Updated user: ${updated.id} (${user.ssoUserId})`);
        } else {
          // Generate unique noUrut
          const lastUser = await prisma.pegawai.findFirst({
            orderBy: { noUrut: 'desc' },
            select: { noUrut: true },
          });
          const nextNoUrut = (lastUser?.noUrut || 0) + 1;

          // Generate unique username
          let username = user.email;
          let counter = 1;
          while (await prisma.pegawai.findFirst({ where: { username } })) {
            username = `${user.email.split('@')[0]}${counter}`;
            counter++;
          }

          const created = await prisma.pegawai.create({
            data: {
              noUrut: nextNoUrut,
              namaLengkap: fullName,
              username,
              noHp: user.phone || '',
              passwordHash: '',
              role: logbookRole,
              ssoUserId: user.ssoUserId,
              portalTenantId: departemen.portalTenantId,
              departemenId: tenant.id,
            },
          });

          results.push({
            ssoUserId: user.ssoUserId,
            email: user.email,
            status: 'created',
            userId: created.id,
          });
          createdCount++;
          console.log(`[Bulk API] Created user: ${created.id} (${user.ssoUserId})`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Bulk API] Failed to process user ${user.ssoUserId}:`, message);

        results.push({
          ssoUserId: user.ssoUserId,
          email: user.email,
          status: 'skipped',
          error: message,
        });
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        portalTenantId: tenant.idDep,
        name: tenant.nama,
        description: tenant.deskripsi,
        isActive: tenant.isActive,
        created: tenantCreated,
      },
      users: {
        total: users.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        results,
      },
    });
  } catch (error) {
    console.error('[Bulk API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
