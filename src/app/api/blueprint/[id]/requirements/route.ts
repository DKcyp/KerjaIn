import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/blueprint/[id]/requirements - Get all requirements for a blueprint
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

    const requirements = await prisma.blueprintRequirement.findMany({
      where: { blueprintId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: requirements
    });

  } catch (error) {
    console.error('Error fetching requirements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch requirements' },
      { status: 500 }
    );
  }
}

// POST /api/blueprint/[id]/requirements - Create new requirement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blueprintId = parseInt(id);
    const body = await request.json();
    const { description, assignedTo, moduleId } = body;

    if (isNaN(blueprintId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint ID' },
        { status: 400 }
      );
    }

    if (!description || !assignedTo) {
      return NextResponse.json(
        { success: false, error: 'Description and assignedTo are required' },
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

    const requirement = await prisma.blueprintRequirement.create({
      data: {
        blueprintId,
        description,
        assignedTo
      }
    });

    // Add activity log
    await prisma.blueprintActivityLog.create({
      data: {
        blueprintId,
        userId: assignedTo,
        action: 'ADD_REQUIREMENT',
        description: `New requirement added: ${description}`,
        notes: null
      }
    });

    return NextResponse.json({
      success: true,
      data: requirement,
      message: 'Requirement created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating requirement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create requirement' },
      { status: 500 }
    );
  }
}
