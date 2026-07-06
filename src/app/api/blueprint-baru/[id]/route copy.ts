import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Get project detail with BAs and modules
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    
    // Get type filter from query params
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type"); // 'BLUEPRINT' or 'BERITA_ACARA'
    const viewFilter = searchParams.get("view"); // 'crm' = show CRM drafts only | 'logbook' = show non-CRM drafts only

    // Get project detail
    const project = await prisma.proyek.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        namaProyek: true,
        client: true,
        kodeProyek: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    // Build where clause for BA filter
    const whereClause: any = {
      projectId,
    };
    
    if (typeFilter && (typeFilter === 'BLUEPRINT' || typeFilter === 'BERITA_ACARA')) {
      whereClause.type = typeFilter;

      if (typeFilter === 'BLUEPRINT') {
        if (viewFilter === 'logbook') {
          // Logbook internal view: show DRAFT only if sumber != CRM (i.e. created in Logbook)
          // Non-DRAFT records are always shown regardless of source.
          whereClause.OR = [
            { status: { not: 'DRAFT' } },
            { status: 'DRAFT', sumber: { not: 'CRM' } },
          ];
        } else {
          // Default / CRM view: show DRAFT only if sumber = CRM
          // Non-DRAFT records are always shown regardless of source.
          whereClause.OR = [
            { status: { not: 'DRAFT' } },
            { status: 'DRAFT', sumber: 'CRM' },
          ];
        }
      }
    }

    // Fetch bacara records using Prisma
    const bacaras = await prisma.bacara.findMany({
      where: whereClause,
      include: {
        baModules: {
          include: {
            taskBAs: {
              include: {
                programmer: {
                  select: {
                    id: true,
                    namaLengkap: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { level: 'asc' },
            { order: 'asc' },
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[API] Found ${bacaras.length} BA records for project ${projectId} with type filter: ${typeFilter}`);

    // Transform the data for the frontend
    const baList = bacaras.map((ba) => {
      console.log(`[API] Processing BA ID ${ba.id}: ${ba.nama}`);
      
      // Transform modules with their tasks
      const transformedModules = ba.baModules.map((module) => ({
        id: module.id.toString(),
        kode: module.kode || "",
        modul: module.nama,
        version: module.version || "0.0.1",
        ba: ba.nama,
        baVersion: ba.version,
        level: module.level,
        isAppModule: module.isAppModule || false,
        tasklist: module.taskBAs.map((task) => ({
          id: task.id.toString(),
          namaTask: task.nama || "",
          kompleksitas: task.kompleksitas,
          estimasi: 8, // Default value
          programmerId: task.programmerId || 0,
          programmer: task.programmer?.namaLengkap || "",
          deskripsi: task.deskripsi || "",
          jadwalMulai: task.jadwalMulai ? new Date(task.jadwalMulai).toISOString().split('T')[0] : "",
          lampiran: undefined,
          isApproved: task.isApproved || false,
          approvedAt: task.approvedAt ? new Date(task.approvedAt).toISOString() : null,
          tasklistId: task.tasklistId || null,
        })),
        parentId: module.parentId?.toString(),
        depth: module.level - 1, // Convert level to depth
      }));

      return {
        id: ba.id,
        ba: ba.nama,
        baVersion: ba.version,
        deskripsi: ba.deskripsi || '',
        status: ba.status || 'DRAFT',
        type: ba.type || 'BERITA_ACARA',
        sumber: ba.sumber || 'LOGBOOK',
        submittedAt: ba.submittedAt ? ba.submittedAt.toISOString() : null,
        fileRFC: ba.fileRFC || null,
        fileCED: ba.fileCED || null,
        fileOK: ba.fileOK || null,
        modules: transformedModules,
      };
    });

    // Create flat modules list for backward compatibility
    const modules = baList.flatMap(ba => ba.modules);

    // Get project modules directly from ProyekModule table
    const projectModules = await prisma.proyekModule.findMany({
      where: { projectId },
      select: {
        id: true,
        nama: true,
        parentId: true,
        baVersion: true,
      },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        project,
        businessAnalysts: baList,
        modules, // For backward compatibility
        projectModules,
      },
    });
  } catch (error) {
    console.error("Error fetching project detail:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch project detail",
      },
      { status: 500 }
    );
  }
}
