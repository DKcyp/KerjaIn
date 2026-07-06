import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { calculateTaskDueDate } from "@/lib/taskDueDateCalculator";

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
        baDocuments: {
          where: {
            isLatest: true,
          },
        },
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
                tasklist: {
                  select: {
                    id: true,
                    status: true,
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
    const baList = await Promise.all(bacaras.map(async (ba) => {
      console.log(`[API] Processing BA ID ${ba.id}: ${ba.nama}`);
      
      // Transform modules with their tasks
      const transformedModules = await Promise.all(ba.baModules.map(async (module) => {
        const tasksWithDueDates = await Promise.all(module.taskBAs.map(async (task) => {
          // Calculate due date if scheduled date exists
          let dueDate = null;
          if (task.jadwalMulai) {
            dueDate = await calculateTaskDueDate(task.jadwalMulai, task.kompleksitas);
          }

          // Determine status based on actual tasklist status if it exists
          let status = "Sedang di proses"; // Default status
          if (task.tasklistId) {
            // Fetch the actual tasklist status from database
            const tasklist = await prisma.tasklist.findUnique({
              where: { id: task.tasklistId },
              select: { status: true }
            });
            
            if (tasklist) {
              status = tasklist.status === 'SELESAI' ? "Selesai" : "Sedang di proses";
            }
          }

          return {
            id: task.id.toString(),
            namaTask: task.nama || "",
            kompleksitas: task.kompleksitas,
            estimasi: 8, // Default value
            programmerId: task.programmerId || 0,
            programmer: task.programmer?.namaLengkap || "",
            deskripsi: task.deskripsi || "",
            jadwalMulai: task.jadwalMulai ? new Date(task.jadwalMulai).toISOString().split('T')[0] : "",
            jadwalExternal: task.jadwalExternal ? new Date(task.jadwalExternal).toISOString().split('T')[0] : "",
            durasiPengerjaan: task.durasiPengerjaan ? Number(task.durasiPengerjaan) : null,
            durasiExternal: task.durasiExternal ? Number(task.durasiExternal) : null,
            scheduledAt: task.jadwalMulai ? new Date(task.jadwalMulai).toISOString() : null,
            status: status,
            dueDate: dueDate ? dueDate.toISOString() : null,
            lampiran: undefined,
            isApproved: task.isApproved || false,
            approvedAt: task.approvedAt ? new Date(task.approvedAt).toISOString() : null,
            tasklistId: task.tasklistId || null,
            revisiKeterangan: task.revisiKeterangan || null,
            revisiFileUrl: task.revisiFileUrl || null,
            revisiAt: task.revisiAt ? new Date(task.revisiAt).toISOString() : null,
          };
        }));

        return {
          id: module.id.toString(),
          kode: module.kode || "",
          modul: module.nama,
          version: module.version || "0.0.1",
          ba: ba.nama,
          baVersion: ba.version,
          level: module.level,
          isAppModule: module.isAppModule || false,
          gambar: module.gambar || null,
          keterangan: module.keterangan || null,
          tasklist: tasksWithDueDates,
          parentId: module.parentId?.toString(),
          depth: module.level - 1, // Convert level to depth
        };
      }));

      const fileOKObj = ba.baDocuments.find(doc => doc.type === 'OK');
      const fileRFCObj = ba.baDocuments.find(doc => doc.type === 'RFC');
      const fileCEDObj = ba.baDocuments.find(doc => doc.type === 'CED');

      return {
        id: ba.id,
        ba: ba.nama,
        baVersion: ba.version,
        deskripsi: ba.deskripsi || '',
        status: ba.status || 'DRAFT',
        type: ba.type || 'BERITA_ACARA',
        sumber: ba.sumber || 'LOGBOOK',
        submittedAt: ba.submittedAt ? ba.submittedAt.toISOString() : null,
        createdAt: ba.createdAt.toISOString(),
        updatedAt: ba.updatedAt.toISOString(),
        fileRFC: ba.fileRFC || null,
        fileCED: ba.fileCED || null,
        fileOK: ba.fileOK || null,
        isNonaktif: (ba as any).isNonaktif || false,
        idBlueprintBaru: (ba as any).idBlueprintBaru || null,
        rfcCount: parseInt((ba as any).rfcCount || '0') || 0,
        modules: transformedModules,
      };
    }));

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

    // Build flat rows for each BA (for the edit modal)
    const baFlatRows = baList.map(ba => {
      const flatRows: any[] = [];
      for (const mod of ba.modules) {
        for (const task of mod.tasklist) {
          const proyekModule = projectModules.find(pm => pm.nama === mod.modul);
          flatRows.push({
            moduleValue: proyekModule ? `${proyekModule.id}:${mod.modul}` : mod.modul,
            moduleId: proyekModule?.id || null,
            moduleName: mod.modul,
            taskName: task.namaTask || '',
            programmerId: task.programmerId ? task.programmerId.toString() : '',
            jadwalMulai: task.jadwalMulai || '',
            kompleksitas: task.kompleksitas || 'MEDIUM',
            durasi: task.durasiPengerjaan || null,
            isApproved: task.isApproved || false,
            approvedAt: task.approvedAt || null,
            tasklistId: task.tasklistId || null,
            gambar: mod.gambar || null,
            keterangan: mod.keterangan || null,
          });
        }
      }
      return { baId: ba.id, rows: flatRows };
    });

    return NextResponse.json({
      success: true,
      data: {
        project,
        businessAnalysts: baList,
        modules,
        projectModules,
        baFlatRows,
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