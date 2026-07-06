import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('[Portal Apps] Request received');
    
    // Get session from cookie
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      console.log('[Portal Apps] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Portal Apps] Session found, user ID:', session.id);

    // Get user from database
    const user = await (prisma as any).pegawai.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        portalTenantId: true,
        ssoUserId: true,
      }
    });
    
    if (!user) {
      console.log('[Portal Apps] User not found in database');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Portal Apps] User found:', {
      id: user.id,
      hasTenantId: !!user.portalTenantId,
      hasSsoUserId: !!user.ssoUserId
    });

    // If user doesn't have Portal tenant ID, they can't access Portal apps
    if (!user.portalTenantId) {
      console.log('[Portal Apps] User has no Portal tenant ID, returning empty apps');
      return NextResponse.json({ 
        apps: [],
        portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3001'
      });
    }

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || process.env.PORTAL_URL || 'http://localhost:3001';
    const apiUrl = `${portalUrl}/api/tenant-apps?tenantId=${user.portalTenantId}`;
    
    console.log('[Portal Apps] Fetching from Portal:', apiUrl);
    
    // Fetch apps from Portal API
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('[Portal Apps] Portal response status:', response.status);

    if (!response.ok) {
      console.error('[Portal Apps] Portal API error:', response.status, response.statusText);
      // Return empty apps instead of error to gracefully handle Portal unavailability
      return NextResponse.json({ 
        apps: [],
        portalUrl,
        error: `Portal API returned ${response.status}`
      });
    }

    const data = await response.json();
    console.log('[Portal Apps] Received apps count:', data.apps?.length || 0);
    
    return NextResponse.json({ 
      apps: data.apps || [],
      portalUrl 
    });
  } catch (error) {
    console.error('[Portal Apps] Error:', error);
    // Return empty apps with error message instead of 500
    return NextResponse.json({ 
      apps: [], 
      portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3001',
      error: error instanceof Error ? error.message : 'Failed to fetch apps' 
    });
  }
}
