import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { DEVELOPMENT_OR_HIGHER_STATUSES, compareVersions } from '@/lib/versionService';

export const runtime = 'nodejs';

// GET /api/business-analyst
export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const items = await prisma.bacara.findMany({
      where: {
        projectId: parseInt(projectId),
        status: { in: DEVELOPMENT_OR_HIGHER_STATUSES },
      },
      select: {
        id: true,
        projectId: true,
        nama: true,
        version: true,
        status: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    items.sort((a, b) => compareVersions(b.version, a.version));

    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET /api/business-analyst error:', e);
    return NextResponse.json({
      error: 'Server error',
      details: e instanceof Error ? e.message : String(e)
    }, { status: 500 });
  }
}
