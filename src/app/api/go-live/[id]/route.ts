import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { notifyMarketingGoLiveCompleted, prepareGoLiveMarketingPayload } from '@/lib/marketingService';

// GET /api/go-live/[id] - Get specific go-live project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const goLiveId = parseInt(id);

    if (isNaN(goLiveId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid go-live ID' },
        { status: 400 }
      );
    }

    const goLive = await prisma.goLive.findUnique({
      where: { id: goLiveId },
      include: {
        project: {
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true,
            client: true,
            pic: true,
          }
        },
        creator: {
          select: {
            id: true,
            namaLengkap: true,
          }
        },
        checklists: {
          orderBy: { order: 'asc' },
          include: {
            completer: {
              select: {
                namaLengkap: true
              }
            }
          }
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                namaLengkap: true
              }
            }
          }
        }
      }
    });

    if (!goLive) {
      return NextResponse.json(
        { success: false, error: 'Go-Live not found' },
        { status: 404 }
      );
    }

    const completedChecklists = goLive.checklists.filter(c => c.isCompleted).length;
    const totalChecklists = goLive.checklists.length;

    const transformedData = {
      id: goLive.id,
      projectId: goLive.projectId,
      kodeProyek: goLive.project.kodeProyek,
      projectName: goLive.project.namaProyek,
      client: goLive.project.client,
      pic: goLive.project.pic,
      status: goLive.status,
      scheduledDate: goLive.scheduledDate?.toISOString(),
      actualGoLiveDate: goLive.actualGoLiveDate?.toISOString(),
      notes: goLive.notes,
      createdBy: goLive.creator.namaLengkap,
      completedChecklists,
      totalChecklists,
      checklists: goLive.checklists.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        isCompleted: c.isCompleted,
        completedBy: c.completer?.namaLengkap,
        completedAt: c.completedAt?.toISOString(),
        order: c.order,
      })),
      activityLogs: goLive.activityLogs.map(log => ({
        id: log.id,
        action: log.action,
        description: log.description,
        notes: log.notes,
        userName: log.user.namaLengkap,
        createdAt: log.createdAt.toISOString(),
      })),
      createdAt: goLive.createdAt.toISOString(),
      updatedAt: goLive.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching go-live:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch go-live'
    }, { status: 500 });
  }
}

// PUT /api/go-live/[id] - Update go-live status
export async function PUT(
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

    if (isNaN(goLiveId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid go-live ID' },
        { status: 400 }
      );
    }

    const { status, scheduledDate, actualGoLiveDate, notes } = body;

    // Check if go-live exists
    const existingGoLive = await prisma.goLive.findUnique({
      where: { id: goLiveId }
    });

    if (!existingGoLive) {
      return NextResponse.json(
        { success: false, error: 'Go-Live not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (actualGoLiveDate !== undefined) updateData.actualGoLiveDate = actualGoLiveDate ? new Date(actualGoLiveDate) : null;
    if (notes !== undefined) updateData.notes = notes;

    const updatedGoLive = await prisma.goLive.update({
      where: { id: goLiveId },
      data: updateData,
      include: {
        project: true
      }
    });

    // Create activity log
    if (status && status !== existingGoLive.status) {
      await prisma.goLiveActivityLog.create({
        data: {
          goLiveId: goLiveId,
          userId: session.id,
          action: 'STATUS_CHANGED',
          description: `Status changed from ${existingGoLive.status} to ${status}`,
        }
      });

      // Notify marketing system when Go Live is completed
      if (status === 'COMPLETED') {
        try {
          const marketingPayload = prepareGoLiveMarketingPayload(updatedGoLive, updatedGoLive.project, session.id);
          const marketingResult = await notifyMarketingGoLiveCompleted(marketingPayload);
          
          if (marketingResult.success) {
            console.log('Go Live marketing notification sent successfully for project:', updatedGoLive.project.kodeProyek);
          } else {
            console.warn('Go Live marketing notification failed for project:', updatedGoLive.project.kodeProyek, marketingResult.message);
          }
        } catch (marketingError) {
          // Log marketing error but don't fail the Go Live completion
          console.error('Go Live marketing notification error for project:', updatedGoLive.project.kodeProyek, marketingError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedGoLive.id,
        status: updatedGoLive.status,
        scheduledDate: updatedGoLive.scheduledDate?.toISOString(),
        actualGoLiveDate: updatedGoLive.actualGoLiveDate?.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error updating go-live:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update go-live'
    }, { status: 500 });
  }
}
