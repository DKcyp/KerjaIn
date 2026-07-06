import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

// GET /api/eut/[id] - Get specific EUT test item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid test item ID' },
        { status: 400 }
      );
    }

    const testItem = await prisma.eutTest.findUnique({
      where: { id: itemId },
      include: {
        tester: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
          }
        },
        approver: {
          select: {
            id: true,
            namaLengkap: true,
          }
        },
        project: {
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true,
          }
        }
      }
    });

    if (!testItem) {
      return NextResponse.json(
        { success: false, error: 'EUT test item not found' },
        { status: 404 }
      );
    }

    const formattedItem = {
      id: testItem.id,
      namaFitur: testItem.namaFitur,
      kode: testItem.kode,
      projectId: testItem.projectId,
      moduleId: testItem.moduleId,
      testerId: testItem.testerId,
      testerName: testItem.tester?.namaLengkap || 'Unknown',
      testerEmail: testItem.tester?.username,
      tanggalTest: testItem.tanggalTest.toISOString(),
      status: testItem.status,
      deskripsi: testItem.deskripsi,
      approvedBy: testItem.approvedBy,
      approvedByName: testItem.approver?.namaLengkap,
      approvedDate: testItem.approvedDate?.toISOString(),
      uatFilePath: testItem.uatFilePath,
      userGuideFiles: testItem.userGuideFiles || [],
      project: testItem.project,
    };

    return NextResponse.json({
      success: true,
      data: formattedItem
    });

  } catch (error) {
    console.error('Error fetching EUT test item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch EUT test item' },
      { status: 500 }
    );
  }
}

// PUT /api/eut/[id] - Update EUT test item (approve with files)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);
    const body = await request.json();

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid test item ID' },
        { status: 400 }
      );
    }

    // Get current user session
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    if (!session?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if item exists
    const existingItem = await prisma.eutTest.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'EUT test item not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status: body.status,
      deskripsi: body.deskripsi || existingItem.deskripsi,
    };

    // If approving, add approval fields
    if (body.status === 'Approved') {
      updateData.approvedBy = session.id;
      updateData.approvedDate = new Date();
      
      // Add file paths if provided
      if (body.uatFilePath) {
        updateData.uatFilePath = body.uatFilePath;
      }
      if (body.userGuideFiles) {
        updateData.userGuideFiles = body.userGuideFiles;
      }
    }

    // Update the item
    const updatedItem = await prisma.eutTest.update({
      where: { id: itemId },
      data: updateData,
      include: {
        tester: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
          }
        },
        approver: {
          select: {
            id: true,
            namaLengkap: true,
          }
        },
        project: {
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true,
          }
        }
      }
    });

    const formattedItem = {
      id: updatedItem.id,
      namaFitur: updatedItem.namaFitur,
      kode: updatedItem.kode,
      projectId: updatedItem.projectId,
      moduleId: updatedItem.moduleId,
      testerId: updatedItem.testerId,
      testerName: updatedItem.tester?.namaLengkap || 'Unknown',
      testerEmail: updatedItem.tester?.username,
      tanggalTest: updatedItem.tanggalTest.toISOString(),
      status: updatedItem.status,
      deskripsi: updatedItem.deskripsi,
      approvedBy: updatedItem.approvedBy,
      approvedByName: updatedItem.approver?.namaLengkap,
      approvedDate: updatedItem.approvedDate?.toISOString(),
      uatFilePath: updatedItem.uatFilePath,
      userGuideFiles: updatedItem.userGuideFiles || [],
      project: updatedItem.project,
    };

    return NextResponse.json({
      success: true,
      data: formattedItem
    });

  } catch (error) {
    console.error('Error updating EUT test item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update EUT test item' },
      { status: 500 }
    );
  }
}

// DELETE /api/eut/[id] - Delete EUT test item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid test item ID' },
        { status: 400 }
      );
    }

    // Check if item exists
    const existingItem = await prisma.eutTest.findUnique({
      where: { id: itemId }
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'EUT test item not found' },
        { status: 404 }
      );
    }

    // Delete the item
    await prisma.eutTest.delete({
      where: { id: itemId }
    });

    return NextResponse.json({
      success: true,
      message: 'EUT test item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting EUT test item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete EUT test item' },
      { status: 500 }
    );
  }
}
