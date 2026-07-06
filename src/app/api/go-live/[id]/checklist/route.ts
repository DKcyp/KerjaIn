import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

// PUT /api/go-live/[id]/checklist - Update checklist item
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
    const { checklistId, isCompleted, description } = body;

    if (isNaN(goLiveId) || !checklistId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Get checklist item
    const checklist = await prisma.goLiveChecklist.findUnique({
      where: { id: parseInt(checklistId) }
    });

    if (!checklist || checklist.goLiveId !== goLiveId) {
      return NextResponse.json(
        { success: false, error: 'Checklist not found' },
        { status: 404 }
      );
    }

    // Update checklist
    const updateData: any = {};
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      if (isCompleted) {
        updateData.completedBy = session.id;
        updateData.completedAt = new Date();
      } else {
        updateData.completedBy = null;
        updateData.completedAt = null;
      }
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    const updatedChecklist = await prisma.goLiveChecklist.update({
      where: { id: parseInt(checklistId) },
      data: updateData,
      include: {
        completer: {
          select: {
            namaLengkap: true
          }
        }
      }
    });

    // Create activity log
    if (isCompleted !== undefined) {
      await prisma.goLiveActivityLog.create({
        data: {
          goLiveId: goLiveId,
          userId: session.id,
          action: isCompleted ? 'CHECKLIST_COMPLETED' : 'CHECKLIST_REOPENED',
          description: `${isCompleted ? 'Completed' : 'Reopened'} checklist: ${checklist.title}`,
        }
      });

      // Check if all checklists are completed
      const allChecklists = await prisma.goLiveChecklist.findMany({
        where: { goLiveId: goLiveId }
      });

      const allCompleted = allChecklists.every(c => c.isCompleted);

      // If all checklists are completed, change status to COMPLETED
      if (allCompleted && isCompleted) {
        await prisma.goLive.update({
          where: { id: goLiveId },
          data: { status: 'COMPLETED' }
        });

        await prisma.goLiveActivityLog.create({
          data: {
            goLiveId: goLiveId,
            userId: session.id,
            action: 'STATUS_CHANGED',
            description: 'All checklists completed - Status changed to COMPLETED (LIVE)',
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedChecklist.id,
        title: updatedChecklist.title,
        description: updatedChecklist.description,
        isCompleted: updatedChecklist.isCompleted,
        completedBy: updatedChecklist.completer?.namaLengkap,
        completedAt: updatedChecklist.completedAt?.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update checklist'
    }, { status: 500 });
  }
}

// POST /api/go-live/[id]/checklist - Add new checklist item
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
    const { title, description } = body;

    if (isNaN(goLiveId) || !title) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Get max order
    const maxOrder = await prisma.goLiveChecklist.findFirst({
      where: { goLiveId },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const newChecklist = await prisma.goLiveChecklist.create({
      data: {
        goLiveId,
        title,
        description,
        order: maxOrder?.order ? maxOrder.order + 1 : 1,
      }
    });

    // Create activity log
    await prisma.goLiveActivityLog.create({
      data: {
        goLiveId,
        userId: typeof session.id === 'string' ? parseInt(session.id) : session.id,
        action: 'CHECKLIST_ADDED',
        description: `Added new checklist: ${title}`,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newChecklist.id,
        title: newChecklist.title,
        description: newChecklist.description,
        isCompleted: newChecklist.isCompleted,
        order: newChecklist.order,
      }
    });

  } catch (error) {
    console.error('Error creating checklist:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create checklist'
    }, { status: 500 });
  }
}
