import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logBacaraActivity, extractRequestInfo } from "@/lib/bacaraLogger";
import { extractBaFormData } from "@/lib/blueprintUpload";

const prisma = new PrismaClient();

// POST - Save complete BA with modules and tasks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);

  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const form = await extractBaFormData(request, projectId);
    const { nama, deskripsi, modules, type, sumber } = form;
    let { version } = form;

    const { getLatestDevelopmentBAVersion } = await import("@/lib/versionService");

    let finalVersion = version;
    if (!finalVersion) {
      const latestVersion = await getLatestDevelopmentBAVersion(projectId, (type as any) || 'BERITA_ACARA');
      if (latestVersion) {
        const parts = latestVersion.split('.');
        if (parts.length === 3) {
          const [major, minor, patch] = parts.map(Number);
          finalVersion = `${major}.${minor}.${patch + 1}`;
        } else {
          // Fallback if not semver
          finalVersion = `${latestVersion}.1`;
        }
      } else {
        finalVersion = "0.0.1";
      }
    }

    // Update version variable to be used in the rest of the file
    version = finalVersion;

    // Validate required fields
    if (!nama || !version) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/complete-ba`,
        httpMethod: 'POST',
        ...requestInfo,
        requestParams: { nama, version },
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'Nama BA dan version wajib diisi',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        actionType: 'CREATE_COMPLETE_BA',
        actionDescription: 'Pembuatan Blueprint lengkap gagal karena nama dan versi belum diisi',
        userId: 1,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Nama BA dan version wajib diisi",
        },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['BLUEPRINT', 'BERITA_ACARA'];
    const baType = type && validTypes.includes(type) ? type : 'BERITA_ACARA';

    // Validate sumber — defaults to CRM (external/API callers). Logbook UI must explicitly pass 'LOGBOOK'.
    const validSumber = ['CRM', 'LOGBOOK'];
    const baSumber = sumber && validSumber.includes(sumber) ? sumber : 'CRM';

    // Start transaction with increased timeout (30 seconds for large BAs)
    const result = await prisma.$transaction(async (tx) => {
      // Get all proyek modules for this project for lookups
      const proyekModules = await tx.proyekModule.findMany({
        where: { projectId },
      });
      const proyekModuleMap = new Map(proyekModules.map(m => [m.id, m]));

      // Calculate overall BA status
      let totalTasks = 0;
      let approvedTasks = 0;

      for (const row of modules) {
        if (row.taskName && row.taskName.trim()) {
          totalTasks++;
          if (row.isApproved) approvedTasks++;
        }
      }

      let baStatus = "DRAFT";
      if (totalTasks > 0) {
        if (approvedTasks === totalTasks) baStatus = "APPROVED";
        else if (approvedTasks > 0) baStatus = "MENUNGGU_APPROVAL";
      }

      // 1. Create Business Analyst
      const ba = await tx.bacara.create({
        data: {
          projectId,
          nama,
          version,
          deskripsi: deskripsi || null,
          status: baStatus as any,
          type: baType as any,
          sumber: baSumber,
        },
      });

      // 2. Create modules and tasks from flat rows
      for (const row of modules) {
        const proyekMod = row.moduleId ? proyekModuleMap.get(row.moduleId) : null;

        // Simpan tepat modul yang dipilih user — tidak auto-create parent
        // Jika proyekMod ditemukan, gunakan namanya; jika tidak, gunakan row.moduleName
        const moduleName = proyekMod ? proyekMod.nama : (row.moduleName || '');
        if (!moduleName) continue;

        const baModule = await tx.bAModule.create({
          data: {
            projectId,
            baId: ba.id,
            nama: moduleName,
            level: 1, // selalu level 1, simpan flat sesuai pilihan user
            version: version,
            isAppModule: true,
            gambar: row.gambar || null,
            keterangan: row.keterangan || null,
          },
        });

        // Create task if provided
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
              tasklistId: row.tasklistId || null,
            },
          });
        }
      }

      return ba;
    }, {
      timeout: 30000,
    });

    const responseTime = Date.now() - startTime;

    // Count rows with tasks for logging
    const rowCount = modules.length;
    const taskCount = modules.filter((r: any) => r.taskName && r.taskName.trim()).length;

    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/complete-ba`,
      httpMethod: 'POST',
      ...requestInfo,
      requestParams: { nama, version, type: baType, rowCount, taskCount },
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId: result.projectId,
      baId: result.id,
      actionType: 'CREATE_COMPLETE_BA',
      actionDescription: `Blueprint "${result.nama}" versi ${result.version} berhasil dibuat lengkap dengan ${rowCount} baris dan ${taskCount} tugas`,
      statusBa: result.status,
      userId: 1,
    });

    // Log activity (outside transaction for safety)
    try {
      await prisma.blueprintActivityLog.create({
        data: {
          blueprintId: projectId,
          userId: 1,
          action: 'CREATE_COMPLETE_BA',
          description: `BA lengkap "${nama}" v${version} dibuat`,
          notes: `Type: ${baType}, ${rowCount} baris, ${taskCount} task`,
        },
      });
    } catch (logError) {
      console.error('Error logging complete BA creation:', logError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        nama: result.nama,
        version: result.version,
        deskripsi: result.deskripsi,
        type: (result as any).type,
        sumber: (result as any).sumber,
      },
    });
  } catch (error) {
    console.error("Error saving complete BA:", error);
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
      actionType: 'CREATE_COMPLETE_BA',
      actionDescription: 'Pembuatan Blueprint lengkap gagal karena terjadi kesalahan pada sistem',
      userId: 1,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save complete BA",
      },
      { status: 500 }
    );
  }
}