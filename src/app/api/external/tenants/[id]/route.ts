import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.LOGBOOK_API_KEY;

  if (!expectedKey) {
    console.error('[Tenant API] LOGBOOK_API_KEY not configured');
    return false;
  }

  return apiKey === expectedKey;
}

/**
 * GET /api/external/tenants/[id]
 * Get a single tenant by logbook ID or portalTenantId (idDep)
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

    // Try to find by numeric ID first, then by idDep (portalTenantId)
    let tenant = null;
    const numericId = Number(idParam);
    if (Number.isFinite(numericId)) {
      tenant = await prisma.masterDepartemen.findUnique({
        where: { id: numericId },
      });
    }
    if (!tenant) {
      tenant = await prisma.masterDepartemen.findUnique({
        where: { idDep: idParam },
      });
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        portalTenantId: tenant.idDep,
        name: tenant.nama,
        description: tenant.deskripsi,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Tenant API] GET [id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/external/tenants/[id]
 * Update a tenant by logbook ID or portalTenantId (idDep)
 *
 * Body: { name?, description?, isActive? }
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
    const { name, description, isActive } = body;

    // Resolve tenant
    let tenant = null;
    const numericId = Number(idParam);
    if (Number.isFinite(numericId)) {
      tenant = await prisma.masterDepartemen.findUnique({
        where: { id: numericId },
      });
    }
    if (!tenant) {
      tenant = await prisma.masterDepartemen.findUnique({
        where: { idDep: idParam },
      });
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const data: any = { updatedAt: new Date() };
    if (name !== undefined) data.nama = name;
    if (description !== undefined) data.deskripsi = description;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.masterDepartemen.update({
      where: { id: tenant.id },
      data,
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: updated.id,
        portalTenantId: updated.idDep,
        name: updated.nama,
        description: updated.deskripsi,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Tenant API] PUT [id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/external/tenants/[id]
 * Delete a tenant by logbook ID or portalTenantId (idDep)
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

    // Resolve tenant
    let tenant = null;
    const numericId = Number(idParam);
    if (Number.isFinite(numericId)) {
      tenant = await prisma.masterDepartemen.findUnique({
        where: { id: numericId },
      });
    }
    if (!tenant) {
      tenant = await prisma.masterDepartemen.findUnique({
        where: { idDep: idParam },
      });
    }

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if any pegawai are linked to this department
    const pegawaiCount = await prisma.pegawai.count({
      where: { departemenId: tenant.id },
    });

    if (pegawaiCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete tenant: ${pegawaiCount} user(s) are still linked to this department. Reassign or remove them first.` },
        { status: 409 }
      );
    }

    await prisma.masterDepartemen.delete({
      where: { id: tenant.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Tenant deleted successfully',
    });
  } catch (error) {
    console.error('[Tenant API] DELETE [id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
