import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapPortalRole } from '@/lib/portal-sso';

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
 * GET /api/external/users/[id]
 * Get a single user by logbook ID, ssoUserId, or username
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await ctx.params;

    // Try to find by numeric ID first, then by ssoUserId, then by username
    let user = null;
    const numericId = Number(idParam);
    if (Number.isFinite(numericId)) {
      user = await prisma.pegawai.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          noUrut: true,
          username: true,
          namaLengkap: true,
          noHp: true,
          role: true,
          ssoUserId: true,
          portalTenantId: true,
          departemenId: true,
          departemen: {
            select: { id: true, idDep: true, nama: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    }
    if (!user) {
      user = await prisma.pegawai.findFirst({
        where: { ssoUserId: idParam },
        select: {
          id: true,
          noUrut: true,
          username: true,
          namaLengkap: true,
          noHp: true,
          role: true,
          ssoUserId: true,
          portalTenantId: true,
          departemenId: true,
          departemen: {
            select: { id: true, idDep: true, nama: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    }
    if (!user) {
      user = await prisma.pegawai.findFirst({
        where: { username: idParam },
        select: {
          id: true,
          noUrut: true,
          username: true,
          namaLengkap: true,
          noHp: true,
          role: true,
          ssoUserId: true,
          portalTenantId: true,
          departemenId: true,
          departemen: {
            select: { id: true, idDep: true, nama: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        noUrut: user.noUrut,
        username: user.username,
        fullName: user.namaLengkap,
        phone: user.noHp,
        role: user.role,
        ssoUserId: user.ssoUserId,
        portalTenantId: user.portalTenantId,
        departmentId: user.departemenId,
        department: user.departemen
          ? {
              id: user.departemen.id,
              portalTenantId: user.departemen.idDep,
              name: user.departemen.nama,
            }
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('[User API] GET [id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/external/users/[id]
 * Update a user by logbook ID, ssoUserId, or username
 *
 * Body: { portalTenantId?, email?, firstName?, lastName?, role?, phone? }
 */
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await ctx.params;
    const body = await request.json();
    const { portalTenantId, email, firstName, lastName, role, phone } = body;

    // Resolve user
    let existing = null;
    const numericId = Number(idParam);
    if (Number.isFinite(numericId)) {
      existing = await prisma.pegawai.findUnique({ where: { id: numericId } });
    }
    if (!existing) {
      existing = await prisma.pegawai.findFirst({ where: { ssoUserId: idParam } });
    }
    if (!existing) {
      existing = await prisma.pegawai.findFirst({ where: { username: idParam } });
    }

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data: any = { updatedAt: new Date() };

    if (firstName !== undefined || lastName !== undefined) {
      const parts = [
        firstName !== undefined ? firstName : existing.namaLengkap.split(' ')[0],
        lastName !== undefined ? lastName : existing.namaLengkap.split(' ').slice(1).join(' '),
      ];
      data.namaLengkap = parts.join(' ').trim();
    }

    if (phone !== undefined) data.noHp = phone;
    if (role !== undefined) data.role = mapPortalRole(role);

    if (portalTenantId !== undefined) {
      data.portalTenantId = portalTenantId;
      const department = await prisma.masterDepartemen.findUnique({
        where: { idDep: portalTenantId },
      });
      if (!department) {
        return NextResponse.json(
          { error: 'Tenant not found in logbook. Please sync tenant first.' },
          { status: 404 }
        );
      }
      data.departemenId = department.id;
    }

    if (email !== undefined) {
      // Check username uniqueness if changing
      const usernameConflict = await prisma.pegawai.findFirst({
        where: { username: email, id: { not: existing.id } },
      });
      if (usernameConflict) {
        return NextResponse.json({ error: 'Email/username already in use by another user' }, { status: 409 });
      }
      data.username = email;
    }

    const updated = await prisma.pegawai.update({
      where: { id: existing.id },
      data,
      select: {
        id: true,
        noUrut: true,
        username: true,
        namaLengkap: true,
        noHp: true,
        role: true,
        ssoUserId: true,
        portalTenantId: true,
        departemenId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        noUrut: updated.noUrut,
        username: updated.username,
        fullName: updated.namaLengkap,
        phone: updated.noHp,
        role: updated.role,
        ssoUserId: updated.ssoUserId,
        portalTenantId: updated.portalTenantId,
        departmentId: updated.departemenId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[User API] PUT [id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/external/users/[id]
 * Delete a user by logbook ID, ssoUserId, or username
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await ctx.params;

    // Resolve user
    let existing = null;
    const numericId = Number(idParam);
    if (Number.isFinite(numericId)) {
      existing = await prisma.pegawai.findUnique({ where: { id: numericId } });
    }
    if (!existing) {
      existing = await prisma.pegawai.findFirst({ where: { ssoUserId: idParam } });
    }
    if (!existing) {
      existing = await prisma.pegawai.findFirst({ where: { username: idParam } });
    }

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.pegawai.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('[User API] DELETE [id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
