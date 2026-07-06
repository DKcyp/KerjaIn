import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

/**
 * Admin API to manually link Logbook users to Portal users
 * 
 * POST /api/admin/link-portal-user
 * Body: { logbookUserId: number, portalUserId: string }
 * 
 * This is useful for:
 * - Linking existing users that weren't auto-matched
 * - Fixing incorrect auto-links
 * - Bulk user migration
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const sessionCookie = request.cookies.get('session');
    const session = verifySession(sessionCookie?.value);
    
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { logbookUserId, portalUserId } = body;

    if (!logbookUserId || !portalUserId) {
      return NextResponse.json(
        { error: 'logbookUserId and portalUserId are required' },
        { status: 400 }
      );
    }

    // Check if Portal user is already linked to another user
    const existingLink = await prisma.pegawai.findFirst({
      where: { 
        ssoUserId: portalUserId,
        id: { not: logbookUserId }
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { 
          error: 'Portal user is already linked to another Logbook user',
          linkedTo: {
            id: existingLink.id,
            username: existingLink.username,
            namaLengkap: existingLink.namaLengkap
          }
        },
        { status: 409 }
      );
    }

    // Link the users
    const user = await prisma.pegawai.update({
      where: { id: logbookUserId },
      data: { ssoUserId: portalUserId },
    });

    console.log('[Admin] Manually linked user:', {
      logbookUserId,
      portalUserId,
      username: user.username
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        namaLengkap: user.namaLengkap,
        ssoUserId: user.ssoUserId
      }
    });

  } catch (error) {
    console.error('[Admin] Link user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/link-portal-user
 * 
 * Get list of users and their Portal link status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const sessionCookie = request.cookies.get('session');
    const session = verifySession(sessionCookie?.value);
    
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const users = await prisma.pegawai.findMany({
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        ssoUserId: true,
        createdAt: true,
      },
      orderBy: { namaLengkap: 'asc' }
    });

    const stats = {
      total: users.length,
      linked: users.filter(u => u.ssoUserId).length,
      unlinked: users.filter(u => !u.ssoUserId).length,
    };

    return NextResponse.json({
      users,
      stats
    });

  } catch (error) {
    console.error('[Admin] Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/link-portal-user
 * 
 * Unlink a user from Portal
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin session
    const sessionCookie = request.cookies.get('session');
    const session = verifySession(sessionCookie?.value);
    
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { logbookUserId } = body;

    if (!logbookUserId) {
      return NextResponse.json(
        { error: 'logbookUserId is required' },
        { status: 400 }
      );
    }

    // Unlink the user
    const user = await prisma.pegawai.update({
      where: { id: logbookUserId },
      data: { ssoUserId: null },
    });

    console.log('[Admin] Unlinked user:', {
      logbookUserId,
      username: user.username
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        namaLengkap: user.namaLengkap,
        ssoUserId: user.ssoUserId
      }
    });

  } catch (error) {
    console.error('[Admin] Unlink user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
