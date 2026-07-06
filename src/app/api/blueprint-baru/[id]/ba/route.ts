import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logBacaraActivity, extractRequestInfo } from "@/lib/bacaraLogger";

const prisma = new PrismaClient();

// POST - Create new Business Analyst
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

    const { nama, deskripsi, type } = body;
    let { version } = body;

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
    if (!nama) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/ba`,
        httpMethod: 'POST',
        ...requestInfo,
        requestParams: body,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'Nama BA wajib diisi',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        actionType: 'CREATE_BA',
        actionDescription: 'Pembuatan Blueprint gagal karena nama BA belum diisi',
        userId: 1, // TODO: Get from session
      });

      return NextResponse.json(
        {
          success: false,
          error: "Nama BA wajib diisi",
        },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['BLUEPRINT', 'BERITA_ACARA'];
    const baType = type && validTypes.includes(type) ? type : 'BERITA_ACARA';

    // Validate sumber
    const validSumber = ['CRM', 'LOGBOOK'];
    const baSumber = body.sumber && validSumber.includes(body.sumber) ? body.sumber : 'CRM';

    // Check if BA with same name and version already exists in this project
    const existingBA = await prisma.bacara.findFirst({
      where: {
        projectId,
        nama,
        version: version || "0.0.1",
      },
    });

    if (existingBA) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/ba`,
        httpMethod: 'POST',
        ...requestInfo,
        requestParams: body,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'BA dengan nama dan versi yang sama sudah ada',
        errorCode: 'DUPLICATE_BA',
        projectId,
        actionType: 'CREATE_BA',
        actionDescription: `Pembuatan Blueprint "${nama}" gagal karena sudah ada data yang sama`,
        userId: 1, // TODO: Get from session
      });

      return NextResponse.json(
        {
          success: false,
          error: "BA dengan nama dan versi yang sama sudah ada",
        },
        { status: 400 }
      );
    }

    // Create BA
    const newBA = await prisma.bacara.create({
      data: {
        projectId,
        nama,
        version: version || "0.0.1",
        deskripsi: deskripsi || null,
        type: baType,
        sumber: baSumber,
      },
    });

    const responseTime = Date.now() - startTime;

    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/ba`,
      httpMethod: 'POST',
      ...requestInfo,
      requestParams: body,
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId,
      baId: newBA.id,
      actionType: 'CREATE_BA',
      actionDescription: `Blueprint "${nama}" versi ${version || "0.0.1"} berhasil dibuat`,
      statusBa: newBA.status,
      userId: 1, // TODO: Get from session
    });

    // Log to blueprint_activity_log (existing)
    try {
      await prisma.blueprintActivityLog.create({
        data: {
          blueprintId: projectId,
          userId: 1, // TODO: Get from session/auth
          action: 'CREATE_BA',
          description: `BA "${nama}" v${version || "0.0.1"} dibuat`,
          notes: `Type: ${baType}${deskripsi ? `, Deskripsi: ${deskripsi}` : ''}`,
        },
      });
    } catch (logError) {
      console.error('Error logging BA creation:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newBA.id,
        nama: newBA.nama,
        version: newBA.version,
        deskripsi: newBA.deskripsi,
        type: newBA.type,
      },
    });
  } catch (error) {
    console.error("Error creating BA:", error);
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
      actionType: 'CREATE_BA',
      actionDescription: 'Pembuatan Blueprint gagal karena terjadi kesalahan pada sistem',
      userId: 1, // TODO: Get from session
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create BA",
      },
      { status: 500 }
    );
  }
}

// PUT - Update Business Analyst
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);

  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { baId, nama, version, deskripsi, type } = body;

    if (!baId) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/ba`,
        httpMethod: 'PUT',
        ...requestInfo,
        requestParams: body,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'BA ID is required',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        actionType: 'UPDATE_BA',
        actionDescription: 'Pembaruan Blueprint gagal karena identitas BA belum diisi',
        userId: 1,
      });

      return NextResponse.json(
        {
          success: false,
          error: "BA ID is required",
        },
        { status: 400 }
      );
    }

    // Get old BA data for logging
    const oldBA = await prisma.bacara.findUnique({
      where: { id: parseInt(baId) },
      select: { status: true },
    });

    // Validate type if provided
    const validTypes = ['BLUEPRINT', 'BERITA_ACARA'];
    const updateData: any = {
      nama,
      version,
      deskripsi: deskripsi || null,
    };

    if (type && validTypes.includes(type)) {
      updateData.type = type;
    }

    const updatedBA = await prisma.bacara.update({
      where: { id: parseInt(baId) },
      data: updateData,
    });

    const responseTime = Date.now() - startTime;

    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/ba`,
      httpMethod: 'PUT',
      ...requestInfo,
      requestParams: body,
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId: updatedBA.projectId,
      baId: updatedBA.id,
      actionType: 'UPDATE_BA',
      actionDescription: `Blueprint "${updatedBA.nama}" versi ${updatedBA.version} berhasil diperbarui`,
      statusBa: updatedBA.status,
      oldStatusBa: oldBA?.status,
      userId: 1,
    });

    // Log activity (existing)
    try {
      await prisma.blueprintActivityLog.create({
        data: {
          blueprintId: updatedBA.projectId,
          userId: 1, // TODO: Get from session/auth
          action: 'UPDATE_BA',
          description: `BA "${updatedBA.nama}" v${updatedBA.version} diperbarui`,
          notes: `Perubahan: ${Object.keys(updateData).join(', ')}`,
        },
      });
    } catch (logError) {
      console.error('Error logging BA update:', logError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedBA.id,
        nama: updatedBA.nama,
        version: updatedBA.version,
        deskripsi: updatedBA.deskripsi,
        type: updatedBA.type,
      },
    });
  } catch (error) {
    console.error("Error updating BA:", error);
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
      actionType: 'UPDATE_BA',
      actionDescription: 'Pembaruan Blueprint gagal karena terjadi kesalahan pada sistem',
      userId: 1,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update BA",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete Business Analyst
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);

  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const baId = searchParams.get("baId");

    if (!baId) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/ba`,
        httpMethod: 'DELETE',
        ...requestInfo,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'BA ID is required',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        actionType: 'DELETE_BA',
        actionDescription: 'Penghapusan Blueprint gagal karena identitas BA belum diisi',
        userId: 1,
      });

      return NextResponse.json(
        {
          success: false,
          error: "BA ID is required",
        },
        { status: 400 }
      );
    }

    // Get BA info before deletion for logging
    const baToDelete = await prisma.bacara.findUnique({
      where: { id: parseInt(baId) },
      select: { projectId: true, nama: true, version: true, status: true },
    });

    // Check if BA has modules
    const modules = await prisma.proyekModule.findMany({
      where: { baId: parseInt(baId) },
    });

    if (modules.length > 0) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/ba`,
        httpMethod: 'DELETE',
        ...requestInfo,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'Cannot delete BA with modules',
        errorCode: 'HAS_MODULES',
        projectId: baToDelete?.projectId,
        baId: parseInt(baId),
        actionType: 'DELETE_BA',
        actionDescription: `Penghapusan Blueprint "${baToDelete?.nama}" gagal karena masih memiliki modul terkait`,
        statusBa: baToDelete?.status,
        userId: 1,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete BA with modules. Delete modules first.",
        },
        { status: 400 }
      );
    }

    await prisma.bacara.delete({
      where: { id: parseInt(baId) },
    });

    const responseTime = Date.now() - startTime;

    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/ba`,
      httpMethod: 'DELETE',
      ...requestInfo,
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId: baToDelete?.projectId,
      baId: parseInt(baId),
      actionType: 'DELETE_BA',
      actionDescription: `Blueprint "${baToDelete?.nama}" versi ${baToDelete?.version} berhasil dihapus`,
      statusBa: baToDelete?.status,
      userId: 1,
    });

    // Log activity (existing)
    try {
      if (baToDelete) {
        await prisma.blueprintActivityLog.create({
          data: {
            blueprintId: baToDelete.projectId,
            userId: 1, // TODO: Get from session/auth
            action: 'DELETE_BA',
            description: `BA "${baToDelete.nama}" v${baToDelete.version} dihapus`,
          },
        });
      }
    } catch (logError) {
      console.error('Error logging BA deletion:', logError);
    }

    return NextResponse.json({
      success: true,
      message: "BA deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting BA:", error);
    const responseTime = Date.now() - startTime;

    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${request.url}`,
      httpMethod: 'DELETE',
      ...requestInfo,
      responseStatusCode: 500,
      responseTimeMs: responseTime,
      isError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'INTERNAL_ERROR',
      actionType: 'DELETE_BA',
      actionDescription: 'Penghapusan Blueprint gagal karena terjadi kesalahan pada sistem',
      userId: 1,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete BA",
      },
      { status: 500 }
    );
  }
}