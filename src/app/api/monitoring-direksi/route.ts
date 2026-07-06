import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get today's date range (start and end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all tasklists created today with pegawai and project info
    const tasklists = await prisma.tasklist.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        status: true,
        pegawai: {
          select: {
            id: true,
            namaLengkap: true,
          },
        },
        project: {
          select: {
            id: true,
            namaProyek: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by pegawai and project
    const groupedData = new Map<string, {
      pegawaiId: number;
      pegawaiName: string;
      projects: Map<string, {
        projectId: number;
        projectName: string;
        total: number;
        belum: number;
        selesai: number;
      }>;
    }>();

    tasklists.forEach((task) => {
      const pegawaiId = task.pegawai?.id || 0;
      const pegawaiName = task.pegawai?.namaLengkap || "Unassigned";
      const projectId = task.project?.id || 0;
      const projectName = task.project?.namaProyek || "No Project";

      // Get or create pegawai entry
      if (!groupedData.has(pegawaiId.toString())) {
        groupedData.set(pegawaiId.toString(), {
          pegawaiId,
          pegawaiName,
          projects: new Map(),
        });
      }

      const pegawaiData = groupedData.get(pegawaiId.toString())!;

      // Get or create project entry for this pegawai
      if (!pegawaiData.projects.has(projectId.toString())) {
        pegawaiData.projects.set(projectId.toString(), {
          projectId,
          projectName,
          total: 0,
          belum: 0,
          selesai: 0,
        });
      }

      const projectData = pegawaiData.projects.get(projectId.toString())!;

      // Count tasks
      projectData.total++;

      // Categorize by status
      if (task.status === "SELESAI") {
        projectData.selesai++;
      } else {
        projectData.belum++;
      }
    });

    // Convert to array format for table
    const result: Array<{
      no: number;
      pegawai: string;
      project: string;
      tasklist: number;
      belum: number;
      selesai: number;
    }> = [];

    let rowNumber = 1;

    groupedData.forEach((pegawaiData) => {
      pegawaiData.projects.forEach((projectData) => {
        result.push({
          no: rowNumber++,
          pegawai: pegawaiData.pegawaiName,
          project: projectData.projectName,
          tasklist: projectData.total,
          belum: projectData.belum,
          selesai: projectData.selesai,
        });
      });
    });

    // Sort by pegawai name, then by project name
    result.sort((a, b) => {
      const nameCompare = a.pegawai.localeCompare(b.pegawai);
      if (nameCompare !== 0) return nameCompare;
      return a.project.localeCompare(b.project);
    });

    // Renumber after sorting
    result.forEach((row, index) => {
      row.no = index + 1;
    });

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching monitoring direktur data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
