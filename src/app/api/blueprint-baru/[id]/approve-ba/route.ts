import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logBacaraActivity, extractRequestInfo } from "@/lib/bacaraLogger";

// POST - Approve BA and sync module versions to bacara version
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
    const { baId, baVersion, baName } = body;

    console.log('[Approve BA] Request:', { projectId, baId, baVersion, baName });

    if (!baId) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/approve-ba`,
        httpMethod: 'POST',
        ...requestInfo,
        requestParams: body,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'BA ID wajib diisi',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        actionType: 'APPROVE_BA',
        actionDescription: 'Persetujuan Blueprint gagal karena identitas BA belum diisi',
        userId: 1,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: "BA ID wajib diisi",
        },
        { status: 400 }
      );
    }

    // Get all modules from this BA
    const baModules = await prisma.bAModule.findMany({
      where: {
        baId: parseInt(baId),
      },
      select: {
        id: true,
        nama: true,
        level: true,
        parentId: true,
      }
    });

    console.log('[Approve BA] Found BA modules:', baModules.length);

    let updatedCount = 0;
    const errors: string[] = [];
    const versionUpdates: Array<{ moduleName: string; newVersion: string }> = [];

    // Get bacara version once (source of truth)
    const bacara = await prisma.bacara.findUnique({
      where: { id: parseInt(baId) },
      select: { version: true }
    });
    const syncVersion = bacara?.version || baVersion || '0.0.1';

    // Sync baVersion for each module in proyek_module
    for (const baModule of baModules) {
      try {
        // Find corresponding proyek_module
        let proyekModule;
        
        if (baModule.level === 1) {
          // Main module
          proyekModule = await prisma.proyekModule.findFirst({
            where: {
              projectId: projectId,
              nama: baModule.nama,
              parentId: null,
            }
          });
        } else if (baModule.level === 2) {
          // Sub module - need to find parent first
          const parentBAModule = await prisma.bAModule.findUnique({
            where: { id: baModule.parentId! },
            select: { nama: true }
          });

          if (parentBAModule) {
            const parentProyekModule = await prisma.proyekModule.findFirst({
              where: {
                projectId: projectId,
                nama: parentBAModule.nama,
                parentId: null,
              }
            });

            if (parentProyekModule) {
              proyekModule = await prisma.proyekModule.findFirst({
                where: {
                  projectId: projectId,
                  nama: baModule.nama,
                  parentId: parentProyekModule.id,
                }
              });
            }
          }
        }

        // Sync baVersion AND baId = bacara.version (no increment)
        // baId update ensures ProyekModule.bacara relation works for getNextVersionForModule
        if (proyekModule) {
          try {
            // CATATAN: proyek_module.baId FK ke business_analyst (legacy), bukan bacara
            // Jangan update baId — hanya sync baVersion saja
            await prisma.proyekModule.update({
              where: { id: proyekModule.id },
              data: {
                baVersion: syncVersion,
              }
            });
            updatedCount++;
            versionUpdates.push({ moduleName: baModule.nama, newVersion: syncVersion });
            console.log(`[Approve BA] Synced module: ${baModule.nama} to version ${syncVersion} (baId: ${baId})`);
          } catch (versionError) {
            const errorMsg = `Error syncing version for module ${baModule.nama}: ${versionError instanceof Error ? versionError.message : String(versionError)}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        } else {
          console.log(`[Approve BA] Module not found in proyek_module: ${baModule.nama}`);
        }
      } catch (error) {
        const errorMsg = `Error processing module ${baModule.nama}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Mark BA as approved and set status to PROSES_DEVELOPMENT
    await prisma.bacara.update({
      where: { id: parseInt(baId) },
      data: {
        status: 'PROSES_DEVELOPMENT',
      }
    });

    console.log(`[Approve BA] Updated ${updatedCount} modules`);

    const responseTime = Date.now() - startTime;
    
    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/approve-ba`,
      httpMethod: 'POST',
      ...requestInfo,
      requestParams: body,
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId,
      baId: parseInt(baId),
      actionType: 'APPROVE_BA',
      actionDescription: `Blueprint "${baName}" versi ${baVersion} berhasil disetujui — ${updatedCount} modul diperbarui ke tahap Pengembangan`,
      oldStatusBa: 'DEVELOPMENT',
      newStatusBa: 'PROSES_DEVELOPMENT',
      statusBa: 'PROSES_DEVELOPMENT',
      userId: 1,
    });

    return NextResponse.json({
      success: true,
      data: {
        updatedModules: updatedCount,
        totalModules: baModules.length,
        versionUpdates,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `BA berhasil di-approve. ${updatedCount} module version di-sinkronisasi dari bacara.`
    });

  } catch (error) {
    console.error("Error approving BA:", error);
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
      actionType: 'APPROVE_BA',
      actionDescription: 'Persetujuan Blueprint gagal karena terjadi kesalahan pada sistem',
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
