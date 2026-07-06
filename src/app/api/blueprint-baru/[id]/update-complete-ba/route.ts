import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logBacaraActivity, extractRequestInfo } from "@/lib/bacaraLogger";
import { parseAndUploadRows } from "@/lib/blueprintUpload";

const prisma = new PrismaClient();

// PUT - Update complete BA with modules and tasks
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);

  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const contentType = request.headers.get('content-type') || '';
    let baId: number;
    let nama: string;
    let version: string;
    let deskripsi: string | null;
    let rows: any[];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      baId = parseInt(formData.get('baId') as string);
      nama = (formData.get('nama') as string) || '';
      version = (formData.get('version') as string) || '';
      deskripsi = (formData.get('deskripsi') as string) || null;
      rows = await parseAndUploadRows(formData, projectId);
    } else {
      const body = await request.json();
      baId = body.baId;
      nama = body.nama;
      version = body.version;
      deskripsi = body.deskripsi || null;
      rows = body.rows || [];
    }

    // Validate required fields
    if (!baId || !nama || !version) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/update-complete-ba`,
        httpMethod: 'PUT',
        ...requestInfo,
        requestParams: { baId, nama, version },
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'BA ID, nama, dan version wajib diisi',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        baId: baId ? parseInt(baId) : undefined,
        actionType: 'UPDATE_COMPLETE_BA',
        actionDescription: 'Pembaruan Blueprint lengkap gagal karena identitas BA, nama, dan versi belum diisi',
        userId: 1,
      });

      return NextResponse.json(
        {
          success: false,
          error: "BA ID, nama, dan version wajib diisi",
        },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Fetch current BA to preserve its status
      const currentBA = await tx.bacara.findUnique({
        where: { id: baId },
        select: { status: true },
      });

      // 1. Update Business Analyst — preserve existing status, only update metadata
      const updatedBA = await tx.bacara.update({
        where: { id: baId },
        data: {
          nama,
          version,
          deskripsi: deskripsi || null,
          status: currentBA?.status ?? 'DRAFT',
        } as any,
      });

      // 2. If rows are provided, update in-place (not delete+recreate)
      if (rows && rows.length > 0) {
        // Delete existing tasks first (always recreated)
        await tx.bATask.deleteMany({
          where: {
            module: {
              baId: baId,
            },
          },
        });

        // Get existing modules ordered by id (preserve order for matching)
        const existingModules = await tx.bAModule.findMany({
          where: { baId: baId },
          orderBy: { id: 'asc' },
        });

        // Get all proyek modules for lookups
        const proyekModules = await tx.proyekModule.findMany({
          where: { projectId },
        });
        const proyekModuleMap = new Map(proyekModules.map(m => [m.id, m]));

        // Update existing or create new modules for each row
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const proyekMod = row.moduleId ? proyekModuleMap.get(row.moduleId) : null;
          const moduleName = proyekMod ? proyekMod.nama : (row.moduleName || '');
          if (!moduleName) continue;

          let baModule;
          if (i < existingModules.length) {
            // Update existing module in-place — preserves moduleId for RFC notes
            baModule = await tx.bAModule.update({
              where: { id: existingModules[i].id },
              data: {
                nama: moduleName,
                version: version,
                gambar: row.gambar || null,
                keterangan: row.keterangan || null,
              },
            });
          } else {
            // Extra rows beyond existing count: create new module
            baModule = await tx.bAModule.create({
              data: {
                projectId,
                baId: baId,
                nama: moduleName,
                level: 1,
                version: version,
                isAppModule: true,
                gambar: row.gambar || null,
                keterangan: row.keterangan || null,
              },
            });
          }

          if (row.taskName && row.taskName.trim()) {
            await tx.bATask.create({
              data: {
                projectId,
                moduleId: baModule.id,
                nama: row.taskName,
                programmerId: row.programmerId || null,
                jadwalMulai: row.jadwalMulai
                  ? new Date(row.jadwalMulai)
                  : null,
                kompleksitas: row.kompleksitas || 'MEDIUM',
                isApproved: row.isApproved || false,
                approvedAt: row.approvedAt ? new Date(row.approvedAt) : null,
                approvedBy: row.approvedBy || null,
                tasklistId: row.tasklistId || null,
              },
            });
          }
        }

        // Delete any extra modules beyond the row count
        if (rows.length < existingModules.length) {
          await tx.bAModule.deleteMany({
            where: {
              id: { in: existingModules.slice(rows.length).map(m => m.id) },
            },
          });
        }
      }

      return updatedBA;
    });

    const responseTime = Date.now() - startTime;

    const rowCount = rows ? rows.length : 0;
    const taskCount = rows ? rows.filter((r: any) => r.taskName && r.taskName.trim()).length : 0;

    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/update-complete-ba`,
      httpMethod: 'PUT',
      ...requestInfo,
      requestParams: { baId, nama, version, rowCount, taskCount },
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId: result.projectId,
      baId: result.id,
      actionType: 'UPDATE_COMPLETE_BA',
      actionDescription: `Blueprint "${result.nama}" versi ${result.version} berhasil diperbarui dengan ${rowCount} baris dan ${taskCount} tugas`,
      statusBa: result.status,
      userId: 1,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        nama: result.nama,
        version: result.version,
        deskripsi: result.deskripsi,
      },
    });
  } catch (error) {
    console.error("Error updating complete BA:", error);
    const responseTime = Date.now() - startTime;

    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${request.url}`,
      httpMethod: 'PUT',
      ...requestInfo,
      responseStatusCode: 500,
      responseTimeMs: responseTime,
      isError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'INTERNAL_ERROR',
      actionType: 'UPDATE_COMPLETE_BA',
      actionDescription: 'Pembaruan Blueprint lengkap gagal karena terjadi kesalahan pada sistem',
      userId: 1,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update complete BA",
      },
      { status: 500 }
    );
  }
}