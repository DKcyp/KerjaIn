import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyMarketingBlueprintApproved, prepareMarketingPayload } from '@/lib/marketingService';

// PUT /api/blueprint/[id]/approve - Approve blueprint
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

    // Check if blueprint exists and is in DRAFT status
    const existingBlueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId },
      include: {
        proyek: true // Include project data for marketing API
      }
    });

    if (!existingBlueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    if (existingBlueprint.blueprintStatus !== 'DRAFT') {
      return NextResponse.json(
        { success: false, error: 'Only draft blueprints can be approved' },
        { status: 400 }
      );
    }

    // Update blueprint status to APPROVED
    const blueprint = await prisma.blueprint.update({
      where: { id: blueprintId },
      data: {
        blueprintStatus: 'APPROVED',
        updatedBy: userId,
        activityLog: {
          create: {
            userId,
            action: 'APPROVE',
            description: 'Blueprint approved',
            notes: notes || 'Blueprint has been approved'
          }
        }
      },
      include: {
        documents: true,
        requirements: true,
        proyek: true, // Include project data for marketing API
        activityLog: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    // Auto-create UAT items for all requirements when blueprint is approved
    console.log('🔍 UAT AUTO-CREATE: Blueprint approved, creating UAT items for all requirements');
    let uatCreatedCount = 0;
    let uatSkippedCount = 0;
    
    try {
      for (const requirement of blueprint.requirements) {
        try {
          console.log(`\n  Processing requirement ${requirement.id}: "${requirement.description}"`);
          
          // Try to find the tasklist to get moduleId
          const tasklist = await prisma.tasklist.findFirst({
            where: {
              projectId: blueprint.proyekId,
              keterangan: requirement.description,
              OR: [
                { tasklistType: 'BLUEPRINT' },
                { pegawaiId: requirement.assignedTo }
              ]
            },
            orderBy: {
              createdAt: 'desc'
            }
          });

          if (!tasklist) {
            console.log(`  ⚠️ No tasklist found for requirement ${requirement.id}`);
            console.log(`     Searched for: keterangan="${requirement.description}", projectId=${blueprint.proyekId}`);
            
            // Try to find ANY tasklist for this project to see what exists
            const anyTasklist = await prisma.tasklist.findFirst({
              where: { projectId: blueprint.proyekId },
              select: { id: true, kode: true, keterangan: true, moduleId: true }
            });
            
            if (anyTasklist) {
              console.log(`     Found other tasklist: "${anyTasklist.keterangan}" (Module: ${anyTasklist.moduleId})`);
            } else {
              console.log(`     No tasklists exist for this project at all!`);
            }
            
            uatSkippedCount++;
            continue;
          }

          console.log(`  ✅ Found tasklist: ID ${tasklist.id}, Module ${tasklist.moduleId}`);

          // Generate UAT code
          const uatCode = `UAT-${blueprint.proyek.kodeProyek}-${tasklist.moduleId}-${requirement.id}`;
          
          // Check if UAT already exists
          const existingUAT = await prisma.uatTest.findFirst({
            where: {
              projectId: blueprint.proyekId,
              moduleId: tasklist.moduleId,
              kode: uatCode
            }
          });

          if (existingUAT) {
            console.log(`  ℹ️ UAT already exists for requirement ${requirement.id} (${uatCode})`);
            uatSkippedCount++;
            continue;
          }

          // Create UAT test item
          await prisma.uatTest.create({
            data: {
              namaFitur: requirement.description,
              kode: uatCode,
              projectId: blueprint.proyekId,
              moduleId: tasklist.moduleId,
              testerId: requirement.assignedTo,
              tanggalTest: new Date(),
              status: 'Pending',
              deskripsi: `Auto-created from blueprint requirement: ${requirement.description}`
            }
          });

          console.log(`  ✅ Created UAT item: ${uatCode} (Module: ${tasklist.moduleId})`);
          uatCreatedCount++;
        } catch (reqError) {
          console.error(`  ❌ Failed to create UAT for requirement ${requirement.id}:`, reqError);
          uatSkippedCount++;
        }
      }
      
      console.log(`\n✅ UAT creation complete: ${uatCreatedCount} created, ${uatSkippedCount} skipped`);
    } catch (uatError) {
      console.error('❌ Error during UAT auto-creation:', uatError);
      // Don't fail the blueprint approval if UAT creation fails
    }

    // Notify marketing system about blueprint approval
    try {
      const marketingPayload = prepareMarketingPayload(blueprint, blueprint.proyek, userId);
      const marketingResult = await notifyMarketingBlueprintApproved(marketingPayload);
      
      if (marketingResult.success) {
        console.log('Marketing notification sent successfully for blueprint:', blueprintId);
      } else {
        console.warn('Marketing notification failed for blueprint:', blueprintId, marketingResult.message);
      }
    } catch (marketingError) {
      // Log marketing error but don't fail the blueprint approval
      console.error('Marketing notification error for blueprint:', blueprintId, marketingError);
    }

    return NextResponse.json({
      success: true,
      data: blueprint,
      message: `Blueprint approved successfully. ${uatCreatedCount} UAT item(s) created.`
    });

  } catch (error) {
    console.error('Error approving blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve blueprint' },
      { status: 500 }
    );
  }
}
