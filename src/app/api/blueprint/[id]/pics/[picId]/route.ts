import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface PIC {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
}

// PUT /api/blueprint/[id]/pics/[picId] - Update PIC
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; picId: string }> }
) {
  try {
    const { id, picId } = await params;
    const blueprintId = parseInt(id);
    const picIdInt = parseInt(picId);
    const body = await request.json();
    const { name, role, email, phone, userId } = body;

    if (isNaN(blueprintId) || isNaN(picIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint or PIC ID' },
        { status: 400 }
      );
    }

    if (!name || !role || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name, role, email, and phone are required' },
        { status: 400 }
      );
    }

    // Get blueprint with current PICs data
    const blueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId }
    });

    if (!blueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    // Parse current PICs data
    const currentPICs = (blueprint.picsData as unknown as PIC[]) || [];
    
    // Find the PIC to update
    const picIndex = currentPICs.findIndex(pic => pic.id === picIdInt);
    
    if (picIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'PIC not found' },
        { status: 404 }
      );
    }

    // Update the PIC
    currentPICs[picIndex] = {
      ...currentPICs[picIndex],
      name,
      role,
      email,
      phone
    };

    // Update blueprint with new PICs data
    const updatedBlueprint = await prisma.blueprint.update({
      where: { id: blueprintId },
      data: { 
        picsData: currentPICs as any,
        updatedBy: userId || 1
      }
    });

    // Add activity log
    await prisma.blueprintActivityLog.create({
      data: {
        blueprintId,
        userId: userId || 1,
        action: 'UPDATE_PIC',
        description: `PIC updated: ${name} (${role})`,
        notes: null
      }
    });

    return NextResponse.json({
      success: true,
      data: currentPICs[picIndex],
      message: 'PIC updated successfully'
    });

  } catch (error) {
    console.error('Error updating PIC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update PIC' },
      { status: 500 }
    );
  }
}

// DELETE /api/blueprint/[id]/pics/[picId] - Delete PIC
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; picId: string }> }
) {
  try {
    const { id, picId } = await params;
    const blueprintId = parseInt(id);
    const picIdInt = parseInt(picId);
    
    // Get userId from request body if provided
    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    if (isNaN(blueprintId) || isNaN(picIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint or PIC ID' },
        { status: 400 }
      );
    }

    // Get blueprint with current PICs data
    const blueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId }
    });

    if (!blueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    // Parse current PICs data
    const currentPICs = (blueprint.picsData as unknown as PIC[]) || [];
    
    // Find the PIC to delete
    const picIndex = currentPICs.findIndex(pic => pic.id === picIdInt);
    
    if (picIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'PIC not found' },
        { status: 404 }
      );
    }

    // Get PIC name for activity log
    const deletedPIC = currentPICs[picIndex];
    
    // Remove PIC from array
    currentPICs.splice(picIndex, 1);

    // Update blueprint with new PICs data
    await prisma.blueprint.update({
      where: { id: blueprintId },
      data: { 
        picsData: currentPICs as any,
        updatedBy: userId || 1
      }
    });

    // Add activity log
    await prisma.blueprintActivityLog.create({
      data: {
        blueprintId,
        userId: userId || 1,
        action: 'DELETE_PIC',
        description: `PIC deleted: ${deletedPIC.name} (${deletedPIC.role})`,
        notes: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'PIC deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting PIC:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete PIC' },
      { status: 500 }
    );
  }
}
