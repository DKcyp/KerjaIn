import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

// POST /api/go-live/[id]/activity - Add activity log entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const goLiveId = parseInt(id);
    const body = await request.json();
    const { description, notes } = body;

    if (isNaN(goLiveId) || !description) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const activityLog = await prisma.goLiveActivityLog.create({
      data: {
        goLiveId,
        userId: session.id,
        action: 'COMMENT',
        description,
        notes,
      },
      include: {
        user: {
          select: {
            namaLengkap: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: activityLog.id,
        action: activityLog.action,
        description: activityLog.description,
        notes: activityLog.notes,
        userName: activityLog.user.namaLengkap,
        createdAt: activityLog.createdAt.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create activity log'
    }, { status: 500 });
  }
}
