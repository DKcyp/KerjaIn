import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/blueprint/[id]/requirements/[reqId] - Update requirement status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    const { id, reqId } = await params;
    const blueprintId = parseInt(id);
    const requirementId = parseInt(reqId);
    const body = await request.json();
    const { status, userId } = body;

    if (isNaN(blueprintId) || isNaN(requirementId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint or requirement ID' },
        { status: 400 }
      );
    }

    if (!status || !userId) {
      return NextResponse.json(
        { success: false, error: 'Status and userId are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['PENDING', 'DONE', 'REVISI'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be PENDING, DONE, or REVISI' },
        { status: 400 }
      );
    }

    // Check if requirement exists and belongs to the blueprint
    const existingRequirement = await prisma.blueprintRequirement.findFirst({
      where: {
        id: requirementId,
        blueprintId: blueprintId
      }
    });

    if (!existingRequirement) {
      return NextResponse.json(
        { success: false, error: 'Requirement not found' },
        { status: 404 }
      );
    }

    // Update requirement status
    const requirement = await prisma.blueprintRequirement.update({
      where: { id: requirementId },
      data: { status },
      include: {
        blueprint: {
          include: {
            proyek: true
          }
        }
      }
    });

    // Add activity log
    const statusMessages = {
      PENDING: 'marked as pending',
      DONE: 'completed',
      REVISI: 'marked for revision'
    };

    await prisma.blueprintActivityLog.create({
      data: {
        blueprintId,
        userId,
        action: 'UPDATE_REQUIREMENT',
        description: `Requirement "${existingRequirement.description}" ${statusMessages[status as keyof typeof statusMessages]}`,
        notes: null
      }
    });

    // Auto-create UAT test item when requirement is marked as DONE
    if (status === 'DONE') {
      try {
        console.log('🔍 UAT AUTO-CREATE: Requirement marked as DONE');
        console.log('  Requirement ID:', requirementId);
        console.log('  Description:', existingRequirement.description);
        console.log('  Project ID:', requirement.blueprint.proyekId);
        console.log('  Assigned To:', existingRequirement.assignedTo);
        
        // Find the tasklist associated with this requirement
        // Try multiple strategies to find the correct tasklist:
        // 1. Match by description and BLUEPRINT type
        // 2. Match by description and assignee
        // 3. Match by description only (fallback)
        const tasklist = await prisma.tasklist.findFirst({
          where: {
            projectId: requirement.blueprint.proyekId,
            keterangan: existingRequirement.description,
            OR: [
              { tasklistType: 'BLUEPRINT' },
              { pegawaiId: existingRequirement.assignedTo }
            ]
          },
          orderBy: {
            createdAt: 'desc' // Get the most recent one if multiple exist
          }
        });

        console.log('  Tasklist found:', tasklist ? `Yes (ID: ${tasklist.id}, moduleId: ${tasklist.moduleId})` : 'No');

        if (!tasklist) {
          console.log(`⚠️ No tasklist found for requirement ${requirementId} (description: "${existingRequirement.description}"), skipping UAT creation`);
        } else {
          // Check if UAT item already exists for this requirement
          const uatCode = `UAT-${requirement.blueprint.proyek.kodeProyek}-${tasklist.moduleId}-${requirementId}`;
          const existingUAT = await prisma.uatTest.findFirst({
            where: {
              projectId: requirement.blueprint.proyekId,
              moduleId: tasklist.moduleId,
              kode: uatCode
            }
          });

          if (!existingUAT) {
            // Create UAT test item (works for both leaf and parent modules)
            await prisma.uatTest.create({
              data: {
                namaFitur: existingRequirement.description,
                kode: uatCode,
                projectId: requirement.blueprint.proyekId,
                moduleId: tasklist.moduleId,
                testerId: existingRequirement.assignedTo,
                tanggalTest: new Date(),
                status: 'Pending',
                deskripsi: `Auto-created from blueprint requirement: ${existingRequirement.description}`
              }
            });

            console.log(`✅ Auto-created UAT item for requirement ${requirementId} (Module ID: ${tasklist.moduleId}, Code: ${uatCode})`);
          } else {
            console.log(`ℹ️ UAT item already exists for requirement ${requirementId} (Code: ${uatCode})`);
          }
        }
      } catch (uatError) {
        // Log error but don't fail the requirement update
        console.error('❌ Failed to auto-create UAT item:', uatError);
      }
    }

    return NextResponse.json({
      success: true,
      data: requirement,
      message: 'Requirement updated successfully'
    });

  } catch (error) {
    console.error('Error updating requirement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update requirement' },
      { status: 500 }
    );
  }
}

// DELETE /api/blueprint/[id]/requirements/[reqId] - Delete requirement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    const { id, reqId } = await params;
    const blueprintId = parseInt(id);
    const requirementId = parseInt(reqId);

    if (isNaN(blueprintId) || isNaN(requirementId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blueprint or requirement ID' },
        { status: 400 }
      );
    }

    // Check if requirement exists and belongs to the blueprint
    const existingRequirement = await prisma.blueprintRequirement.findFirst({
      where: {
        id: requirementId,
        blueprintId: blueprintId
      }
    });

    if (!existingRequirement) {
      return NextResponse.json(
        { success: false, error: 'Requirement not found' },
        { status: 404 }
      );
    }

    // Delete requirement
    await prisma.blueprintRequirement.delete({
      where: { id: requirementId }
    });

    return NextResponse.json({
      success: true,
      message: 'Requirement deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting requirement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete requirement' },
      { status: 500 }
    );
  }
}
