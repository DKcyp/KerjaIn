import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/blueprint-baru/[id]/existing-modules
 * Get existing BA modules for this project to allow selection during import
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);

    // Get all BA modules for this project
    const mainModules = await prisma.$queryRaw<Array<{ id: number; nama: string; kode: string }>>`
      SELECT DISTINCT m.id, m.nama, m.kode
      FROM ba_module m
      INNER JOIN business_analyst ba ON m.ba_id = ba.id
      WHERE ba."projectId" = ${projectId} AND m.level = 1
      ORDER BY m.kode
    `;

    const subModules = await prisma.$queryRaw<Array<{ id: number; nama: string; kode: string; parentId: number }>>`
      SELECT DISTINCT m.id, m.nama, m.kode, m.parent_id as "parentId"
      FROM ba_module m
      INNER JOIN business_analyst ba ON m.ba_id = ba.id
      WHERE ba."projectId" = ${projectId} AND m.level = 2
      ORDER BY m.kode
    `;

    return NextResponse.json({
      success: true,
      mainModules,
      subModules
    });

  } catch (error) {
    console.error('Error fetching existing modules:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
