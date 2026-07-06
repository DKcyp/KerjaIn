import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/blueprint/[id]/reject - Reject blueprint
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blueprintId = parseInt(id);
    const body = await request.json();
    const { userId, notes } = body;

    if (isNaN(blueprintId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!notes || notes.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Check if blueprint exists and is in DRAFT status
    const existingBlueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId }
    });

    if (!existingBlueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    if (existingBlueprint.blueprintStatus !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft blueprints can be rejected' },
        { status: 400 }
      );
    }

    // Update blueprint status to REJECTED
    const blueprint = await prisma.blueprint.update({
      where: { id: blueprintId },
      data: {
        blueprintStatus: 'REJECTED',
        updatedBy: userId,
        activityLog: {
          create: {
            userId,
            action: 'REJECT',
            description: 'Blueprint rejected',
            notes: notes
          }
        }
      },
      include: {
        documents: true,
        requirements: true,
        activityLog: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: blueprint,
      message: 'Blueprint rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reject blueprint' },
      { status: 500 }
    );
  }
}
