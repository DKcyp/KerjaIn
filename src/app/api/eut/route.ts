import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/eut - Get all EUT test items with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const moduleId = searchParams.get('moduleId');

    // Build where clause based on filters
    const whereClause: any = {};
    
    if (projectId) {
      whereClause.projectId = parseInt(projectId);
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (moduleId) {
      whereClause.moduleId = parseInt(moduleId);
    }

    const eutItems = await prisma.eutTest.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true
          }
        },
        tester: {
          select: {
            id: true,
            namaLengkap: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data for frontend
    const transformedItems = eutItems.map((item: any) => ({
      id: item.id,
      namaFitur: item.namaFitur,
      kode: item.kode,
      projectId: item.projectId,
      moduleId: item.moduleId,
      testerId: item.testerId,
      testerName: item.tester.namaLengkap,
      testerEmail: item.tester.username,
      tanggalTest: item.tanggalTest.toISOString(),
      status: item.status,
      deskripsi: item.deskripsi,
      approvedBy: item.approvedBy,
      approvedDate: item.approvedDate?.toISOString(),
      project: item.project
    }));

    return NextResponse.json({
      success: true,
      data: transformedItems
    });

  } catch (error) {
    console.error('Error fetching EUT items:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch EUT items'
    }, { status: 500 });
  }
}

// POST /api/eut - Create new EUT test item
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
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const newEutItem = await prisma.eutTest.create({
      data: {
        namaFitur,
        kode,
        projectId: parseInt(projectId),
        moduleId: parseInt(moduleId),
        testerId: parseInt(testerId),
        tanggalTest: new Date(tanggalTest),
        status: 'Pending',
        deskripsi
      },
      include: {
        project: {
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true
          }
        },
        tester: {
          select: {
            id: true,
            namaLengkap: true,
            username: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedItem = {
      id: newEutItem.id,
      namaFitur: newEutItem.namaFitur,
      kode: newEutItem.kode,
      projectId: newEutItem.projectId,
      moduleId: newEutItem.moduleId,
      testerId: newEutItem.testerId,
      testerName: newEutItem.tester.namaLengkap,
      testerEmail: newEutItem.tester.username,
      tanggalTest: newEutItem.tanggalTest.toISOString(),
      status: newEutItem.status,
      deskripsi: newEutItem.deskripsi,
      approvedBy: newEutItem.approvedBy,
      approvedDate: newEutItem.approvedDate?.toISOString(),
      project: newEutItem.project
    };

    return NextResponse.json({
      success: true,
      data: transformedItem
    });

  } catch (error) {
    console.error('Error creating EUT item:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create EUT item'
    }, { status: 500 });
  }
}
