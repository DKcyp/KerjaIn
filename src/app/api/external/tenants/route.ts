import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * External API for Portal to sync tenants to Logbook
 * 
 * Authentication: API Key in header
 * Usage: Portal calls this when creating/updating tenants
 */

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
 * GET /api/external/tenants
 * List all tenants in logbook
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenants = await prisma.masterDepartemen.findMany({
      select: {
        id: true,
        idDep: true,
        nama: true,
        deskripsi: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { nama: 'asc' }
    });

    return NextResponse.json({
      success: true,
      tenants: tenants.map(t => ({
        id: t.id,
        portalTenantId: t.idDep, // idDep stores the Portal tenant ID
        name: t.nama,
        description: t.deskripsi,
        isActive: t.isActive,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }))
    });
  } catch (error) {
    console.error('[Tenant API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/external/tenants
 * Create or update a tenant from Portal
 * 
 * Supports two payload formats:
 * 1. Direct: { portalTenantId, name, description, isActive }
 * 2. Webhook: { event, data: { portalTenantId, ... }, timestamp }
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
    const { portalTenantId, name, description, isActive = true } = payload;

    if (!portalTenantId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: portalTenantId, name' },
        { status: 400 }
      );
    }

    // Check if tenant already exists
    const existing = await prisma.masterDepartemen.findUnique({
      where: { idDep: portalTenantId }
    });

    let tenant;
    if (existing) {
      // Update existing tenant
      tenant = await prisma.masterDepartemen.update({
        where: { idDep: portalTenantId },
        data: {
          nama: name,
          deskripsi: description,
          isActive,
          updatedAt: new Date(),
        }
      });
      
      console.log('[Tenant API] Updated tenant:', tenant.id);
    } else {
      // Create new tenant
      tenant = await prisma.masterDepartemen.create({
        data: {
          idDep: portalTenantId,
          nama: name,
          deskripsi: description,
          isActive,
        }
      });
      
      console.log('[Tenant API] Created tenant:', tenant.id);
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        portalTenantId: tenant.idDep,
        name: tenant.nama,
        description: tenant.deskripsi,
        isActive: tenant.isActive,
      }
    });
  } catch (error) {
    console.error('[Tenant API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
