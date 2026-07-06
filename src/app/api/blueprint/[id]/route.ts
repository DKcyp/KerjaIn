import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/blueprint/[id] - Get blueprint details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blueprintId = parseInt(id);

    console.log('[Blueprint API] Fetching blueprint with ID:', blueprintId);

    if (isNaN(blueprintId)) {
      console.log('[Blueprint API] Invalid blueprint ID:', id);
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

    const blueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId },
      include: {
        proyek: true,
        documents: {
          orderBy: { createdAt: 'desc' }
        },
        requirements: {
          orderBy: { createdAt: 'asc' }
        },
        activityLog: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Limit to last 10 activities
        }
      }
    });

    console.log('[Blueprint API] Blueprint found:', blueprint ? 'Yes' : 'No');
    if (blueprint) {
      console.log('[Blueprint API] Blueprint details:', {
        id: blueprint.id,
        proyekId: blueprint.proyekId,
        status: blueprint.blueprintStatus
      });
    }

    if (!blueprint) {
      console.log('[Blueprint API] Blueprint not found in database for ID:', blueprintId);
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected format
    const transformedBlueprint = {
      ...blueprint,
      projectId: blueprint.proyek.kodeProyek,
      projectName: blueprint.proyek.namaProyek,
      client: blueprint.proyek.client || '',
      pic: blueprint.proyek.pic || ''
    };

    return NextResponse.json({
      success: true,
      data: transformedBlueprint
    });

  } catch (error) {
    console.error('[Blueprint API] Error fetching blueprint:', error);
    console.error('[Blueprint API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blueprint', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/blueprint/[id] - Update blueprint
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blueprintId = parseInt(id);
    const body = await request.json();
    const { projectName, client, pic, updatedBy } = body;

    if (isNaN(blueprintId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

    // Check if blueprint exists
    const existingBlueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId },
      include: { proyek: true }
    });

    if (!existingBlueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    // Update the project information instead of blueprint
    if (projectName || client || pic) {
      await prisma.proyek.update({
        where: { id: existingBlueprint.proyekId },
        data: {
          ...(projectName && { namaProyek: projectName }),
          ...(client && { client }),
          ...(pic && { pic })
        }
      });
    }

    const blueprint = await prisma.blueprint.update({
      where: { id: blueprintId },
      data: {
        ...(updatedBy && { updatedBy }),
        activityLog: {
          create: {
            userId: updatedBy || existingBlueprint.createdBy,
            action: 'UPDATE',
            description: 'Blueprint updated',
            notes: 'Blueprint information updated'
          }
        }
      },
      include: {
        proyek: true,
        documents: true,
        requirements: true,
        activityLog: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    // Transform the data to match the expected format
    const transformedBlueprint = {
      ...blueprint,
      projectId: blueprint.proyek.kodeProyek,
      projectName: blueprint.proyek.namaProyek,
      client: blueprint.proyek.client || '',
      pic: blueprint.proyek.pic || ''
    };

    return NextResponse.json({
      success: true,
      data: transformedBlueprint
    });

  } catch (error) {
    console.error('Error updating blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update blueprint' },
      { status: 500 }
    );
  }
}

// DELETE /api/blueprint/[id] - Delete blueprint
export async function DELETE(
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

    // Delete blueprint (cascade will handle related records)
    await prisma.blueprint.delete({
      where: { id: blueprintId }
    });

    return NextResponse.json({
      success: true,
      message: 'Blueprint deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete blueprint' },
      { status: 500 }
    );
  }
}
