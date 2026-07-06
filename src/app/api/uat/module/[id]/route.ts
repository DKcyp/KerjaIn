import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/uat/module/[id] - Get all UAT items for a specific module
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const moduleId = parseInt(id);

    if (!moduleId || isNaN(moduleId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid module ID' 
      }, { status: 400 });
    }

    // Get all UAT items for this module
    const uatItems = await prisma.uatTest.findMany({
      where: {
        moduleId: moduleId
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get module information (we'll need to fetch from project modules)
    let moduleInfo = null;
    if (uatItems.length > 0) {
      const projectId = uatItems[0].projectId;
      
      // Fetch module tree to get module details
      try {
        const moduleResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/proyek-modules/${projectId}/tree`);
        if (moduleResponse.ok) {
          const moduleData = await moduleResponse.json();
          
          // Find the specific module in the tree
          const findModule = (nodes: any[], targetId: number): any => {
            for (const node of nodes) {
              if (node.id === targetId) {
                return node;
              }
              if (node.children) {
                const found = findModule(node.children, targetId);
                if (found) return found;
              }
            }
            return null;
          };

          if (moduleData.tree) {
            moduleInfo = findModule(moduleData.tree, moduleId);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch module info:', error);
      }
    }

    // Transform data for frontend
    const transformedItems = uatItems.map((item: any) => ({
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
      data: {
        moduleId: moduleId,
        moduleName: moduleInfo?.nama || `Module ${moduleId}`,
        moduleCode: moduleInfo?.kode || `MOD-${moduleId}`,
        projectId: uatItems[0]?.projectId,
        projectName: uatItems[0]?.project?.namaProyek || 'Unknown Project',
        items: transformedItems,
        totalItems: transformedItems.length,
        pendingItems: transformedItems.filter((item: any) => item.status === 'Pending').length,
        approvedItems: transformedItems.filter((item: any) => item.status === 'Approved').length
      }
    });

  } catch (error) {
    console.error('Error fetching UAT module data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch UAT module data'
    }, { status: 500 });
  }
}
