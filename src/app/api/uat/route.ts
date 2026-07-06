import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/uat - Get all UAT test items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const moduleId = searchParams.get('moduleId');

    let whereClause: any = {};

    if (projectId) {
      whereClause.projectId = parseInt(projectId);
    }

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (moduleId) {
      whereClause.moduleId = parseInt(moduleId);
    }

    const testItems = await prisma.uatTest.findMany({
      where: whereClause,
      include: {
        tester: {
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
      },
      orderBy: {
        tanggalTest: 'desc'
      }
    });

    const formattedItems = testItems.map(item => ({
      id: item.id,
      namaFitur: item.namaFitur,
      kode: item.kode,
      projectId: item.projectId,
      moduleId: item.moduleId,
      testerId: item.testerId,
      testerName: item.tester?.namaLengkap || 'Unknown',
      tanggalTest: item.tanggalTest.toISOString(),
      status: item.status,
      deskripsi: item.deskripsi,
      approvedBy: item.approvedBy,
      approvedDate: item.approvedDate?.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedItems
    });

  } catch (error) {
    console.error('Error fetching UAT test items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UAT test items' },
      { status: 500 }
    );
  }
}

// POST /api/uat - Create new UAT test item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      namaFitur,
      kode,
      projectId,
      moduleId,
      testerId,
      tanggalTest,
      deskripsi
    } = body;

    // Validate required fields
    if (!namaFitur || !kode || !projectId || !moduleId || !testerId || !tanggalTest) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const testItem = await prisma.uatTest.create({
      data: {
        namaFitur,
        kode,
        projectId: parseInt(projectId),
        moduleId: parseInt(moduleId),
        testerId: parseInt(testerId),
        tanggalTest: new Date(tanggalTest),
        status: 'Pending',
        deskripsi: deskripsi || null,
      },
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
      id: testItem.id,
      namaFitur: testItem.namaFitur,
      kode: testItem.kode,
      projectId: testItem.projectId,
      moduleId: testItem.moduleId,
      testerId: testItem.testerId,
      testerName: testItem.tester?.namaLengkap || 'Unknown',
      tanggalTest: testItem.tanggalTest.toISOString(),
      status: testItem.status,
      deskripsi: testItem.deskripsi,
      approvedBy: testItem.approvedBy,
      approvedDate: testItem.approvedDate?.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: formattedItem
    });

  } catch (error) {
    console.error('Error creating UAT test item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create UAT test item' },
      { status: 500 }
    );
  }
}
