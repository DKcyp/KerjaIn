import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// GET /api/uat/[id] - Get specific UAT test item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid test item ID' },
        { status: 400 }
      );
    }

    const testItem = await prisma.uatTest.findUnique({
      where: { id },
      include: {
        tester: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
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
        { success: false, error: 'UAT test item not found' },
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
      approvedDate: testItem.approvedDate?.toISOString(),
      rejectedBy: testItem.rejectedBy,
      rejectedDate: testItem.rejectedDate?.toISOString(),
      attachmentPath: testItem.attachmentPath,
      project: testItem.project,
    };

    return NextResponse.json({
      success: true,
      data: formattedItem
    });

  } catch (error) {
    console.error('Error fetching UAT test item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UAT test item' },
      { status: 500 }
    );
  }
}

// PUT /api/uat/[id] - Update UAT test item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid test item ID' },
        { status: 400 }
      );
    }

    // Check content type to handle both JSON and FormData
    const contentType = request.headers.get('content-type') || '';
    let namaFitur, kode, moduleId, testerId, tanggalTest, status, deskripsi, approvedBy, rejectedBy, approvedDate;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with file upload)
      const formData = await request.formData();
      namaFitur = formData.get('namaFitur') as string;
      kode = formData.get('kode') as string;
      moduleId = formData.get('moduleId') as string;
      testerId = formData.get('testerId') as string;
      tanggalTest = formData.get('tanggalTest') as string;
      status = formData.get('status') as string;
      deskripsi = formData.get('deskripsi') as string;
      approvedBy = formData.get('approvedBy') as string;
      rejectedBy = formData.get('rejectedBy') as string;
      approvedDate = formData.get('approvedDate') as string;
      const comment = formData.get('comment') as string;
      // Use comment as deskripsi if provided
      if (comment) deskripsi = comment;
      file = formData.get('file') as File | null;
    } else {
      // Handle JSON (backward compatibility)
      const body = await request.json();
      namaFitur = body.namaFitur;
      kode = body.kode;
      moduleId = body.moduleId;
      testerId = body.testerId;
      tanggalTest = body.tanggalTest;
      status = body.status;
      deskripsi = body.deskripsi;
      approvedBy = body.approvedBy;
      rejectedBy = body.rejectedBy;
      approvedDate = body.approvedDate;
    }

    // Check if test item exists
    const existingItem = await prisma.uatTest.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'UAT test item not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (namaFitur !== undefined && namaFitur) updateData.namaFitur = namaFitur;
    if (kode !== undefined && kode) updateData.kode = kode;
    if (moduleId !== undefined && moduleId) updateData.moduleId = parseInt(moduleId);
    if (testerId !== undefined && testerId) updateData.testerId = parseInt(testerId);
    if (tanggalTest !== undefined && tanggalTest) updateData.tanggalTest = new Date(tanggalTest);
    if (status !== undefined && status) updateData.status = status;
    if (deskripsi !== undefined && deskripsi) updateData.deskripsi = deskripsi;
    if (approvedBy !== undefined && approvedBy) updateData.approvedBy = approvedBy;
    if (rejectedBy !== undefined && rejectedBy) updateData.rejectedBy = rejectedBy;
    if (approvedDate !== undefined && approvedDate) updateData.approvedDate = new Date(approvedDate);

    // Set approval date if status is being approved
    if (status === 'Approved' && existingItem.status !== 'Approved') {
      updateData.approvedDate = new Date();
    }

    // Set rejection date if status is being rejected
    if (status === 'Rejected' && existingItem.status !== 'Rejected') {
      updateData.rejectedDate = new Date();
    }

    // Handle file upload
    if (file && file.size > 0) {
      try {
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'uat');
        
        // Create directory if it doesn't exist
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${id}_${timestamp}_${sanitizedFileName}`;
        const filePath = join(uploadsDir, fileName);

        // Convert file to buffer and write
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Store relative path in database
        updateData.attachmentPath = `/api/uploads/uat/${fileName}`;
      } catch (fileError) {
        console.error('Error saving file:', fileError);
        return NextResponse.json({
          success: false,
          error: 'Failed to save attachment file'
        }, { status: 500 });
      }
    }

    const updatedItem = await prisma.uatTest.update({
      where: { id },
      data: updateData,
      include: {
        tester: {
          select: {
            id: true,
            namaLengkap: true,
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
      tanggalTest: updatedItem.tanggalTest.toISOString(),
      status: updatedItem.status,
      deskripsi: updatedItem.deskripsi,
      approvedBy: updatedItem.approvedBy,
      approvedDate: updatedItem.approvedDate?.toISOString(),
      rejectedBy: updatedItem.rejectedBy,
      rejectedDate: updatedItem.rejectedDate?.toISOString(),
      attachmentPath: updatedItem.attachmentPath,
    };

    return NextResponse.json({
      success: true,
      data: formattedItem
    });

  } catch (error) {
    console.error('Error updating UAT test item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update UAT test item' },
      { status: 500 }
    );
  }
}

// DELETE /api/uat/[id] - Delete UAT test item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid test item ID' },
        { status: 400 }
      );
    }

    // Check if test item exists
    const existingItem = await prisma.uatTest.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'UAT test item not found' },
        { status: 404 }
      );
    }

    await prisma.uatTest.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'UAT test item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting UAT test item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete UAT test item' },
      { status: 500 }
    );
  }
}
