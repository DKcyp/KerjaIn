import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logBacaraActivity, extractRequestInfo } from "@/lib/bacaraLogger";

const prisma = new PrismaClient();

// Helper function to extract module name from "id:name" format
const cleanModuleName = (value: string): string => {
  if (!value) return '';
  // If value contains ":", extract the name part after the colon
  if (value.includes(':')) {
    return value.split(':').slice(1).join(':').trim(); // Handle cases where name might also contain ":"
  }
  return value.trim();
};

// POST - Approve module to proyek_module database
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);
  
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { rowId, type, mainModuleName, subModuleName, parentMainModuleId, baVersion, baName } = body;

    console.log('[Approve Module] Request body:', { rowId, type, mainModuleName, subModuleName, baVersion, baName });

    // Validate required fields
    if (!type || (!mainModuleName && !subModuleName)) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/approve-module`,
        httpMethod: 'POST',
        ...requestInfo,
        requestParams: body,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'Type dan nama module wajib diisi',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        actionType: 'APPROVE_MODULE',
        actionDescription: 'Persetujuan modul gagal karena jenis dan nama modul belum diisi',
        userId: 1,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: "Type dan nama module wajib diisi",
        },
        { status: 400 }
      );
    }

    let result;

    if (type === 'main') {
      // Handle main module approval
      const cleanedMainModuleName = cleanModuleName(mainModuleName);
      if (!cleanedMainModuleName) {
        return NextResponse.json(
          {
            success: false,
            error: "Nama main module wajib diisi",
          },
          { status: 400 }
        );
      }

      // Provide default branch pathing replacing previous merge logic
        // Get next order for main modules
        const maxOrder = await prisma.proyekModule.findFirst({
          where: {
            projectId: projectId,
            parentId: null
          },
          orderBy: { order: 'desc' }
        });

        const nextOrder = (maxOrder?.order || 0) + 1;

        // Create main module in proyek_module
        result = await prisma.proyekModule.create({
          data: {
            projectId: projectId,
            nama: cleanedMainModuleName,
            kode: String(nextOrder).padStart(2, '0'),
            order: nextOrder,
            isLeaf: false,
            parentId: null,
            version: baVersion || '0.0.1',
            baVersion: baVersion || '0.0.1',
            ba: baName || null,
          }
        });

      // Module sudah langsung aktif di proyek_module, tidak perlu update status lagi

    } else if (type === 'sub') {
      // Handle sub module approval
      const cleanedMainModuleName = cleanModuleName(mainModuleName);
      const cleanedSubModuleName = cleanModuleName(subModuleName);
      
      if (!cleanedSubModuleName) {
        return NextResponse.json(
          {
            success: false,
            error: "Nama sub module wajib diisi",
          },
          { status: 400 }
        );
      }

      // Find parent main module in proyek_module
      let parentModule = await prisma.proyekModule.findFirst({
        where: {
          projectId: projectId,
          nama: cleanedMainModuleName,
          parentId: null
        }
      });

      // If parent main module doesn't exist, create it first
      if (!parentModule) {
        const maxOrder = await prisma.proyekModule.findFirst({
          where: {
            projectId: projectId,
            parentId: null
          },
          orderBy: { order: 'desc' }
        });

        const nextOrder = (maxOrder?.order || 0) + 1;

        parentModule = await prisma.proyekModule.create({
          data: {
            projectId: projectId,
            nama: cleanedMainModuleName,
            kode: String(nextOrder).padStart(2, '0'),
            order: nextOrder,
            isLeaf: false,
            parentId: null,
            version: baVersion || '0.0.1',
            baVersion: baVersion || '0.0.1',
            ba: baName || null,
          }
        });
      }

      // Proceed with creating new sub module
        // Get next order for sub modules under this main module
        const maxSubOrder = await prisma.proyekModule.findFirst({
          where: {
            projectId: projectId,
            parentId: parentModule.id
          },
          orderBy: { order: 'desc' }
        });

        const nextSubOrder = (maxSubOrder?.order || 0) + 1;

        // Create sub module in proyek_module
        result = await prisma.proyekModule.create({
          data: {
            projectId: projectId,
            nama: cleanedSubModuleName,
            kode: `${parentModule.kode}.${String(nextSubOrder).padStart(2, '0')}`,
            order: nextSubOrder,
            isLeaf: true,
            parentId: parentModule.id,
            version: baVersion || '0.0.1',
            baVersion: baVersion || '0.0.1',
            ba: baName || null,
          }
        });

      // Module sudah langsung aktif di proyek_module, tidak perlu update status lagi
    }

    const responseTime = Date.now() - startTime;
    const moduleName = type === 'main' ? cleanModuleName(mainModuleName) : cleanModuleName(subModuleName);
    
    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/approve-module`,
      httpMethod: 'POST',
      ...requestInfo,
      requestParams: body,
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId,
      moduleId: result!.id,
      actionType: 'APPROVE_MODULE',
      actionDescription: `${type === 'main' ? 'Modul utama' : 'Sub modul'} "${moduleName}" berhasil disetujui dan ditambahkan ke proyek dengan kode ${result!.kode}`,
      userId: 1,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result!.id,
        nama: result!.nama,
        kode: result!.kode || '',
        type: type,
      },
      message: `${type === 'main' ? 'Main module' : 'Sub module'} berhasil di-approve ke proyek`
    });

  } catch (error) {
    console.error("Error approving module to proyek:", error);
    const responseTime = Date.now() - startTime;
    
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${request.url}`,
      httpMethod: 'POST',
      ...requestInfo,
      responseStatusCode: 500,
      responseTimeMs: responseTime,
      isError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'INTERNAL_ERROR',
      actionType: 'APPROVE_MODULE',
      actionDescription: 'Persetujuan modul gagal karena terjadi kesalahan pada sistem',
      userId: 1,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}