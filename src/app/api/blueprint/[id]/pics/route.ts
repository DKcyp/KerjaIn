import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/blueprint/[id]/pics - Get all PICs for a blueprint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blueprintId = parseInt(id);

    if (isNaN(blueprintId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

    const blueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId },
      select: { picsData: true } as any
    });

    if (!blueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    const pics = blueprint.picsData as any[] || [];

    return NextResponse.json({
      success: true,
      data: pics
    });

  } catch (error) {
    console.error('Error fetching PICs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch PICs' },
      { status: 500 }
    );
  }
}

// POST /api/blueprint/[id]/pics - Update PICs for a blueprint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blueprintId = parseInt(id);
    const body = await request.json();
    const { pics, userId } = body;

    if (isNaN(blueprintId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

    if (!Array.isArray(pics)) {
      return NextResponse.json(
        { success: false, error: 'PICs must be an array' },
        { status: 400 }
      );
    }

    // Check if blueprint exists
    const existingBlueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId }
    });

    if (!existingBlueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    // Update PICs data
    const updatedBlueprint = await prisma.blueprint.update({
      where: { id: blueprintId },
      data: {
        picsData: pics
      } as any
    });

    // Add activity log
    await prisma.blueprintActivityLog.create({
      data: {
        blueprintId,
        userId: userId || 1,
        action: 'UPDATE_PICS',
        description: `PICs updated (${pics.length} PICs)`,
        notes: null
      }
    });

    return NextResponse.json({
      success: true,
      data: pics,
      message: 'PICs updated successfully'
    });

  } catch (error) {
    console.error('Error updating PICs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update PICs' },
      { status: 500 }
    );
  }
}
