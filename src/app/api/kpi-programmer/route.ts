import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { 
  getUserTotalWorkingHours, 
  calculateUtilizationRate, 
  calculateProductivity,
  calculateCompletionRate,
  calculateOnTimeRate,
  calculateAverageCompletionTime,
  getPerformanceLevel
} from "@/lib/kpiCalculator";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // day, week, month, year
    const pegawaiId = searchParams.get("pegawaiId");

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Build where clause
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: now,
      },
    };

    if (pegawaiId) {
      whereClause.pegawaiId = parseInt(pegawaiId);
    }

    // Get all tasklists in the period with createdBy (for PM filtering)
    const tasklists = await prisma.tasklist.findMany({
      where: whereClause,
      select: {
        id: true,
        kode: true,
        status: true,
        customDurationHours: true,
        totalDurationMinutes: true,
        createdAt: true,
        updatedAt: true,
        assigneeWorkDeadline: true,
        pegawaiId: true,
        createdBy: true,
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
        backlog: {
          select: {
            estimatedManHour: true,
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get all tasklist logs for JP calculation
    const tasklistLogs = await prisma.tasklistLog.findMany({
      where: {
        taskId: { in: tasklists.map(t => t.id) },
      },
      select: {
        taskId: true,
        totalStartStopMinutes: true,
        waktu: true,
      },
    });

    // Group by programmer
    const programmerStats = new Map<number, {
      pegawaiId: number;
      pegawaiName: string;
      tim: string;
      totalTasks: number;
      selesai: number;
      reviewPM: number;
      proses: number;
      belumDiproses: number;
      jamAbsen: number;
      jamTotal: number;
      jamSelesai: number;
      jamBelum: number;
      selisihJam: number;
      revisi: number;
      jamProses: number;
      jamAktifSelesai: number;
      totalEstimatedHours: number;
      totalActualMinutes: number;
      avgCompletionTime: number;
      productivity: number;
      completionRate: number;
      onTimeRate: number;
      onTimeTasks: number;
      overdueTasks: number;
      projects: Set<string>;
      totalWorkingHours: number; // Dari RichzSpot
      utilizationRate: number;
    }>();

    tasklists.forEach((task) => {
      // Filter: Only include if pegawaiId is assigned (not PM's task)
      // PM tasks are counted separately with 20% weight
      const pegawaiId = task.pegawaiId || 0;
      const pegawaiName = task.pegawai?.namaLengkap || "Unassigned";
      const createdByPmId = task.createdBy || 0;

      // Initialize programmer stats
      if (!programmerStats.has(pegawaiId)) {
        programmerStats.set(pegawaiId, {
          pegawaiId,
          pegawaiName,
          tim: "Manage Service",
          totalTasks: 0,
          selesai: 0,
          reviewPM: 0,
          proses: 0,
          belumDiproses: 0,
          jamAbsen: 0, // Will be filled from RichzSpot
          jamTotal: 0, // JT: Total jam jadwal tasklist
          jamSelesai: 0, // JS: Total jam jadwal tasklist selesai
          jamBelum: 0, // JB: Total jam jadwal tasklist belum selesai
          selisihJam: 0, // SJ: JA - JS
          revisi: 0,
          jamProses: 0, // JP: Jam tasklist log dalam JA
          jamAktifSelesai: 0, // JAS: JA sampai menit sekarang
          totalEstimatedHours: 0,
          totalActualMinutes: 0,
          avgCompletionTime: 0,
          productivity: 0,
          completionRate: 0,
          onTimeRate: 0,
          onTimeTasks: 0,
          overdueTasks: 0,
          projects: new Set(),
          totalWorkingHours: 0,
          utilizationRate: 0,
        });
      }

      // Initialize PM stats if not exists
      if (createdByPmId && !programmerStats.has(createdByPmId)) {
        programmerStats.set(createdByPmId, {
          pegawaiId: createdByPmId,
          pegawaiName: "PM", // Will be filled later
          tim: "Manage Service",
          totalTasks: 0,
          selesai: 0,
          reviewPM: 0,
          proses: 0,
          belumDiproses: 0,
          jamAbsen: 0,
          jamTotal: 0,
          jamSelesai: 0,
          jamBelum: 0,
          selisihJam: 0,
          revisi: 0,
          jamProses: 0,
          jamAktifSelesai: 0,
          totalEstimatedHours: 0,
          totalActualMinutes: 0,
          avgCompletionTime: 0,
          productivity: 0,
          completionRate: 0,
          onTimeRate: 0,
          onTimeTasks: 0,
          overdueTasks: 0,
          projects: new Set(),
          totalWorkingHours: 0,
          utilizationRate: 0,
        });
      }

      const stats = programmerStats.get(pegawaiId)!;
      const pmStats = createdByPmId ? programmerStats.get(createdByPmId)! : null;

      stats.totalTasks++;

      // Add project
      if (task.project?.namaProyek) {
        stats.projects.add(task.project.namaProyek);
      }

      // Get estimated hours
      const estimatedHours = task.customDurationHours 
        ? Number(task.customDurationHours)
        : (task.backlog && task.backlog.length > 0 && task.backlog[0].estimatedManHour
          ? Number(task.backlog[0].estimatedManHour)
          : 0);

      // JT: Add to total jam jadwal tasklist
      stats.jamTotal += estimatedHours;
      if (pmStats) {
        pmStats.jamTotal += estimatedHours * 0.2; // PM gets 20%
      }

      // Count by status and calculate JS, JB
      switch (task.status) {
        case "SELESAI":
          stats.selesai++;
          
          if (task.totalDurationMinutes) {
            const actualHours = task.totalDurationMinutes / 60;
            stats.totalActualMinutes += task.totalDurationMinutes;
            stats.jamSelesai += actualHours; // JS: Add to jam selesai
            stats.jamAktifSelesai += actualHours; // JAS: Add to jam aktif selesai
          }

          if (pmStats) {
            pmStats.selesai++;
            if (task.totalDurationMinutes) {
              pmStats.jamSelesai += (task.totalDurationMinutes / 60) * 0.2; // PM gets 20%
              pmStats.jamAktifSelesai += (task.totalDurationMinutes / 60) * 0.2;
            }
          }

          if (task.assigneeWorkDeadline && task.updatedAt) {
            const targetDate = new Date(task.assigneeWorkDeadline);
            const completionDate = new Date(task.updatedAt);
            
            if (completionDate <= targetDate) {
              stats.onTimeTasks++;
              if (pmStats) pmStats.onTimeTasks++;
            } else {
              stats.overdueTasks++;
              if (pmStats) pmStats.overdueTasks++;
            }
          }
          break;

        case "MENUNGGU_REVIEW_PM":
          stats.reviewPM++;
          if (pmStats) pmStats.reviewPM++;
          break;

        case "SEDANG_DIPROSES_USER":
        case "SEDANG_DIPROSES_USER_PAUSED":
          stats.proses++;
          stats.jamBelum += estimatedHours; // JB: Add remaining hours
          if (pmStats) {
            pmStats.proses++;
            pmStats.jamBelum += estimatedHours * 0.2;
          }
          break;

        case "MENUNGGU_PROSES_USER":
        default:
          stats.belumDiproses++;
          stats.jamBelum += estimatedHours; // JB: Add remaining hours
          if (pmStats) {
            pmStats.belumDiproses++;
            pmStats.jamBelum += estimatedHours * 0.2;
          }
      }

      if (task.status !== "SELESAI" && task.assigneeWorkDeadline) {
        const targetDate = new Date(task.assigneeWorkDeadline);
        if (now > targetDate) {
          stats.overdueTasks++;
          if (pmStats) pmStats.overdueTasks++;
        }
      }
    });

    // Calculate JP (Jam tasklist log yang dalam JA) from tasklist logs
    const taskLogsByPegawai = new Map<number, number>();
    tasklistLogs.forEach(log => {
      const task = tasklists.find(t => t.id === log.taskId);
      if (task && task.pegawaiId) {
        const current = taskLogsByPegawai.get(task.pegawaiId) || 0;
        taskLogsByPegawai.set(task.pegawaiId, current + (log.totalStartStopMinutes || 0));
      }
    });

    // Update JP for each programmer
    taskLogsByPegawai.forEach((minutes, pegawaiId) => {
      const stats = programmerStats.get(pegawaiId);
      if (stats) {
        stats.jamProses = minutes / 60; // JP: Jam tasklist log dalam JA
      }
    });

    // Get working hours from RichzSpot for each programmer and calculate metrics
    const kpiData = await Promise.all(
      Array.from(programmerStats.values()).map(async (stats) => {
        // Get total working hours from RichzSpot API
        let totalWorkingHours = 0;
        let jamAbsenWithBreak = 0;
        
        try {
          const scheduleInfo = await getUserTotalWorkingHours(stats.pegawaiId, startDate, now);
          totalWorkingHours = scheduleInfo.totalWorkingHours;
          
          // JA: Calculate jam absen (kurang 1 jam jika ada break 12-13)
          jamAbsenWithBreak = scheduleInfo.totalWorkingHours;
          if (scheduleInfo.breakStartTime && scheduleInfo.breakEndTime) {
            // Assume break is 1 hour (12:00-13:00)
            jamAbsenWithBreak -= 1;
          }
          
          stats.jamAbsen = jamAbsenWithBreak;
          
          console.log(`✅ [KPI] User ${stats.pegawaiId}: JA=${jamAbsenWithBreak}, totalWorkingHours=${totalWorkingHours}`);
        } catch (error) {
          console.error(`❌ [KPI] Failed to get working hours for user ${stats.pegawaiId}:`, error);
          // Fallback: calculate based on period
          const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const weeksDiff = daysDiff / 7;
          const workingDays = Math.ceil(weeksDiff * 5);
          totalWorkingHours = workingDays * 8;
          jamAbsenWithBreak = workingDays * 7; // 8 - 1 for break
          stats.jamAbsen = jamAbsenWithBreak;
        }

        stats.totalWorkingHours = totalWorkingHours;

        // Calculate metrics
        stats.completionRate = calculateCompletionRate(stats.selesai, stats.totalTasks);
        stats.onTimeRate = calculateOnTimeRate(stats.onTimeTasks, stats.selesai);
        stats.avgCompletionTime = calculateAverageCompletionTime(stats.totalActualMinutes, stats.selesai);
        
        // SJ = JA - JS (Selisih jam absen dengan jam selesai)
        stats.selisihJam = Math.round((jamAbsenWithBreak - stats.jamSelesai) * 10) / 10;
        
        const actualHours = stats.totalActualMinutes / 60;
        stats.productivity = calculateProductivity(stats.totalEstimatedHours, actualHours);
        stats.utilizationRate = calculateUtilizationRate(actualHours, totalWorkingHours);

        return {
          pegawaiId: stats.pegawaiId,
          pegawaiName: stats.pegawaiName,
          tim: stats.tim,
          totalTasks: stats.totalTasks,
          selesai: stats.selesai,
          reviewPM: stats.reviewPM,
          proses: stats.proses,
          belumDiproses: stats.belumDiproses,
          jamAbsen: Math.round(stats.jamAbsen * 10) / 10, // JA: Jam absen (kurang break)
          jamTotal: Math.round(stats.jamTotal * 10) / 10, // JT: Total jam jadwal tasklist
          jamSelesai: Math.round(stats.jamSelesai * 10) / 10, // JS: Total jam jadwal tasklist selesai
          jamBelum: Math.round(stats.jamBelum * 10) / 10, // JB: Total jam jadwal tasklist belum selesai
          selisihJam: stats.selisihJam, // SJ: JA - JS
          revisi: stats.revisi,
          jamProses: Math.round(stats.jamProses * 10) / 10, // JP: Jam tasklist log dalam JA
          jamAktifSelesai: Math.round(stats.jamAktifSelesai * 10) / 10, // JAS: JA sampai menit sekarang
          completedTasks: stats.selesai,
          inProgressTasks: stats.proses,
          onTimeTasks: stats.onTimeTasks,
          overdueTasks: stats.overdueTasks,
          completionRate: stats.completionRate,
          onTimeRate: stats.onTimeRate,
          avgCompletionTime: stats.avgCompletionTime,
          productivity: stats.productivity,
          totalEstimatedHours: Math.round(stats.totalEstimatedHours * 10) / 10,
          totalActualHours: Math.round(actualHours * 10) / 10,
          totalWorkingHours: Math.round(stats.totalWorkingHours * 10) / 10,
          utilizationRate: stats.utilizationRate,
          projectCount: stats.projects.size,
          projects: Array.from(stats.projects),
        };
      })
    );

    // Sort by completion rate
    kpiData.sort((a, b) => b.completionRate - a.completionRate);

    // Calculate overall statistics
    const overallStats = {
      totalProgrammers: kpiData.length,
      totalTasks: kpiData.reduce((sum, p) => sum + p.totalTasks, 0),
      totalCompleted: kpiData.reduce((sum, p) => sum + p.completedTasks, 0),
      totalInProgress: kpiData.reduce((sum, p) => sum + p.inProgressTasks, 0),
      totalOnTime: kpiData.reduce((sum, p) => sum + p.onTimeTasks, 0),
      totalOverdue: kpiData.reduce((sum, p) => sum + p.overdueTasks, 0),
      totalWorkingHours: Math.round(kpiData.reduce((sum, p) => sum + p.totalWorkingHours, 0) * 10) / 10,
      totalActualHours: Math.round(kpiData.reduce((sum, p) => sum + p.totalActualHours, 0) * 10) / 10,
      avgCompletionRate: kpiData.length > 0 
        ? Math.round(kpiData.reduce((sum, p) => sum + p.completionRate, 0) / kpiData.length)
        : 0,
      avgOnTimeRate: kpiData.length > 0 
        ? Math.round(kpiData.reduce((sum, p) => sum + p.onTimeRate, 0) / kpiData.length)
        : 0,
      avgProductivity: kpiData.length > 0 
        ? Math.round(kpiData.reduce((sum, p) => sum + p.productivity, 0) / kpiData.length)
        : 0,
      avgUtilizationRate: kpiData.length > 0 
        ? Math.round(kpiData.reduce((sum, p) => sum + p.utilizationRate, 0) / kpiData.length)
        : 0,
    };

    return NextResponse.json({
      success: true,
      data: kpiData,
      overall: overallStats,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching KPI programmer data:", error);
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
