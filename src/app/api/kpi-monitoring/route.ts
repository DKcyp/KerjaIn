import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getJadwalByRange } from '@/lib/richzspotService';
import { getUserBreakTime } from '@/lib/breakTimeService';

interface ProgrammerKPI {
  pegawaiId: number;
  pegawaiName: string;
  role: string;
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
  completedTasks: number;
  inProgressTasks: number;
  onTimeTasks: number;
  overdueTasks: number;
  completionRate: number;
  onTimeRate: number;
  avgCompletionTime: number;
  productivity: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  projectCount: number;
  projects: string[];
  tasklists: Array<{
    id: number;
    kode: string;
    status: string;
    project: string;
    module: string;
    estimatedHours: number;
    actualHours: number;
    isRejected: boolean;
  }>;
}

interface OverallStats {
  totalProgrammers: number;
  totalTasks: number;
  totalCompleted: number;
  totalInProgress: number;
  totalOnTime: number;
  totalOverdue: number;
  avgCompletionRate: number;
  avgOnTimeRate: number;
  avgProductivity: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // --- Authentication & Authorization ---
    const { cookies } = await import('next/headers');
    const { verifySession } = await import('@/lib/auth');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    let session: { id: number; role: string } | null = null;
    if (sessionCookie) {
      session = verifySession(sessionCookie.value);
    }

    if (!session) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    // Determine pegawai filter based on role
    let pegawaiFilter: string = '';
    
    if (session.role === 'PROGRAMMER' || session.role === 'ADMIN') {
      // Programmer/Admin: only see own data
      pegawaiFilter = `AND t."pegawaiId" = ${session.id}`;
    } else if (session.role === 'PM') {
      // PM: see self + all team members in PM's projects
      const pmProjects = await prisma.proyekTeam.findMany({
        where: { pegawaiId: session.id },
        select: { projectId: true }
      });
      const projectIds = pmProjects.map(p => p.projectId);

      const memberIdSet = new Set<number>([session.id]); // include PM themselves
      if (projectIds.length > 0) {
        const teamMembers = await prisma.proyekTeam.findMany({
          where: { projectId: { in: projectIds } },
          select: { pegawaiId: true },
          distinct: ['pegawaiId']
        });
        for (const m of teamMembers) memberIdSet.add(m.pegawaiId);
      }
      const memberIds = Array.from(memberIdSet);
      pegawaiFilter = `AND t."pegawaiId" IN (${memberIds.join(',')})`;
    }
    // SUPER_ADMIN: no filter (see all)

    // Build date filter based on updatedAt (when task was last updated)
    const dateFilter: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end day
      
      dateFilter.updatedAt = {
        gte: start,
        lte: end,
      };
    }

    // Fetch tasklists - use raw query to handle null modules gracefully
    const tasklists = await prisma.$queryRawUnsafe(`
      SELECT 
        t.id,
        t.kode,
        t.status,
        t."pegawaiId",
        t.custom_duration_hours,
        t.total_duration_minutes,
        t."calculatedDueDate",
        t."updatedAt",
        p."namaLengkap",
        p.role,
        pr."namaProyek",
        m.nama as "moduleName",
        mt.nama as "teamName"
      FROM tasklist t
      LEFT JOIN pegawai p ON t."pegawaiId" = p.id
      LEFT JOIN proyek pr ON t."projectId" = pr.id
      LEFT JOIN blueprint_module m ON t."moduleId" = m.id
      LEFT JOIN master_team mt ON pr.team_id = mt.id
      WHERE t."pegawaiId" IS NOT NULL
        AND t."updatedAt" >= $1
        AND t."updatedAt" <= $2
        ${pegawaiFilter}
    `, new Date(startDate || '2000-01-01'), new Date(endDate || '2099-12-31')) as any[];

    if (tasklists.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        overall: {
          totalProgrammers: 0,
          totalTasks: 0,
          totalCompleted: 0,
          totalInProgress: 0,
          totalOnTime: 0,
          totalOverdue: 0,
          avgCompletionRate: 0,
          avgOnTimeRate: 0,
          avgProductivity: 0,
        },
      });
    }

    // Get all rejection logs for these tasks
    const taskIds = tasklists.map(t => t.id);
    const rejectionLogs = await prisma.tasklistLog.findMany({
      where: {
        action: 'STATUS_CHANGE',
        taskId: {
          in: taskIds,
        },
        keterangan: {
          contains: 'reject',
          mode: 'insensitive',
        },
      },
      select: {
        taskId: true,
      },
    });

    // Count rejections per task
    const rejectionMap = new Map<number, number>();
    for (const log of rejectionLogs) {
      rejectionMap.set(log.taskId, (rejectionMap.get(log.taskId) || 0) + 1);
    }

    // Get team info for each programmer
    const programmerTeams = await prisma.pegawai.findMany({
      where: {
        id: {
          in: tasklists.map(t => t.pegawaiId).filter(Boolean),
        },
      },
      select: {
        id: true,
        teamMemberships: {
          take: 1,
          select: {
            team: {
              select: {
                nama: true,
              },
            },
          },
        },
      },
    });

    const teamMap = new Map<number, string>();
    for (const p of programmerTeams) {
      teamMap.set(p.id, p.teamMemberships?.[0]?.team?.nama || 'No Team');
    }

    // Group by programmer and calculate metrics
    const programmerMap = new Map<number, ProgrammerKPI>();

    for (const task of tasklists) {
      if (!task.pegawaiId) continue;

      const programmerId = task.pegawaiId;
      const programmerName = task.namaLengkap || 'Unknown';
      // Prioritas: tim dari master_team_member, fallback ke tim project
      const teamName = teamMap.get(programmerId) || task.teamName || 'No Team';

      let kpi = programmerMap.get(programmerId);
      if (!kpi) {
        kpi = {
          pegawaiId: programmerId,
          pegawaiName: programmerName,
          role: task.role || '',
          tim: teamName,
          totalTasks: 0,
          selesai: 0,
          reviewPM: 0,
          proses: 0,
          belumDiproses: 0,
          jamAbsen: 0, // Will be calculated from Jadwal API
          jamTotal: 0,
          jamSelesai: 0,
          jamBelum: 0,
          selisihJam: 0,
          revisi: 0,
          jamProses: 0,
          jamAktifSelesai: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          onTimeTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          onTimeRate: 0,
          avgCompletionTime: 0,
          productivity: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          projectCount: 0,
          projects: [],
          tasklists: [],
        };
        programmerMap.set(programmerId, kpi);
      }

      // Count tasks by status
      kpi.totalTasks++;

      // Count rejections
      const rejectionCount = rejectionMap.get(task.id) || 0;
      kpi.revisi += rejectionCount;

      // Calculate hours
      const estimatedHours = task.custom_duration_hours 
        ? parseFloat(task.custom_duration_hours.toString())
        : 0;
      // total_duration_minutes = actual tracked time from start/stop
      const actualMinutes = Number(task.total_duration_minutes || 0);
      const actualHours = actualMinutes / 60;

      // Store tasklist info
      kpi.tasklists.push({
        id: task.id,
        kode: task.kode,
        status: task.status,
        project: task.namaProyek || 'Unknown',
        module: task.moduleName || 'Unknown',
        estimatedHours,
        actualHours,
        isRejected: rejectionCount > 0,
      });

      // Map status to categories
      switch (task.status) {
        case 'SELESAI':
          kpi.selesai++;
          kpi.completedTasks++;
          break;
        case 'MENUNGGU_REVIEW_PM':
          kpi.reviewPM++;
          break;
        case 'SEDANG_DIPROSES_USER':
        case 'SEDANG_DIPROSES_USER_PAUSED':
          kpi.proses++;
          kpi.inProgressTasks++;
          break;
        case 'MENUNGGU_PROSES_USER':
          kpi.belumDiproses++;
          break;
      }

      // Calculate hours
      kpi.totalEstimatedHours += estimatedHours;
      kpi.totalActualHours += actualHours;
      kpi.jamTotal += estimatedHours;
      
      if (task.status === 'SELESAI') {
        // JS: Jam Selesai - actual hours dari start/stop tracking
        kpi.jamSelesai += actualHours;
        kpi.jamAktifSelesai += actualHours;
      } else {
        // JB: Jam Belum - sisa estimasi yang belum dikerjakan (minimum 0)
        const sisaJam = Math.max(0, estimatedHours - actualHours);
        kpi.jamBelum += sisaJam;
      }
      
      if (task.status === 'SEDANG_DIPROSES_USER' || task.status === 'SEDANG_DIPROSES_USER_PAUSED') {
        kpi.jamProses += actualHours;
      }

      // Check if on time
      if (task.calculatedDueDate && task.updatedAt) {
        if (new Date(task.updatedAt) <= new Date(task.calculatedDueDate)) {
          kpi.onTimeTasks++;
        } else {
          kpi.overdueTasks++;
        }
      }

      // Track projects
      if (task.namaProyek && !kpi.projects.includes(task.namaProyek)) {
        kpi.projects.push(task.namaProyek);
      }
    }

    // Calculate JA (Jam Absen) from Jadwal API for each programmer
    // JA = total jam kerja dari jadwal dalam periode, dikurangi break time
    const startDateForJadwal = startDate || '2000-01-01';
    const endDateForJadwal = endDate || new Date().toISOString().split('T')[0];
    
    console.log(`📊 [KPI Monitoring] Fetching jadwal for ${programmerMap.size} programmers (${startDateForJadwal} - ${endDateForJadwal})`);

    for (const [programmerId, kpi] of programmerMap) {
      try {
        // Get ssoUserId from database
        const pegawaiForJadwal = await prisma.pegawai.findUnique({
          where: { id: programmerId },
          select: { ssoUserId: true }
        });
        
        if (!pegawaiForJadwal?.ssoUserId) {
          console.warn(`⚠️ [KPI Monitoring] Pegawai ${programmerId} has no ssoUserId - using default JA`);
          const daysDiff = Math.ceil((new Date(endDateForJadwal).getTime() - new Date(startDateForJadwal).getTime()) / (1000 * 60 * 60 * 24));
          const workingDays = Math.ceil((daysDiff / 7) * 5);
          kpi.jamAbsen = workingDays * 7;
          continue;
        }

        // Get jadwal data from API using sso_user_id (no auth needed)
        const jadwalData = await getJadwalByRange(startDateForJadwal, endDateForJadwal, { ssoUserId: pegawaiForJadwal.ssoUserId });
        
        // Get break time for this user
        const breakTime = await getUserBreakTime(programmerId);
        let breakDurationMinutes = 60; // default 1 hour break
        if (breakTime) {
          const [bsh, bsm] = breakTime.startTime.split(':').map(Number);
          const [beh, bem] = breakTime.endTime.split(':').map(Number);
          breakDurationMinutes = (beh * 60 + bem) - (bsh * 60 + bsm);
        }

        // Calculate total working hours from jadwal (minus break time)
        let totalWorkingMinutes = 0;
        let workingDays = 0;

        for (const item of jadwalData) {
          // Skip holidays (no shift times)
          if (!item.shift_jam_masuk || !item.shift_jam_pulang) continue;

          const [startH, startM] = item.shift_jam_masuk.substring(0, 5).split(':').map(Number);
          const [endH, endM] = item.shift_jam_pulang.substring(0, 5).split(':').map(Number);
          
          const shiftStartMin = startH * 60 + startM;
          const shiftEndMin = endH * 60 + endM;
          let dayMinutes = shiftEndMin - shiftStartMin;
          
          // Subtract only the OVERLAPPING portion of break time with shift
          if (breakTime) {
            const [bsh, bsm] = breakTime.startTime.split(':').map(Number);
            const [beh, bem] = breakTime.endTime.split(':').map(Number);
            const breakStartMin = bsh * 60 + bsm;
            const breakEndMin = beh * 60 + bem;
            
            // Calculate overlap between break and shift
            const overlapStart = Math.max(shiftStartMin, breakStartMin);
            const overlapEnd = Math.min(shiftEndMin, breakEndMin);
            
            if (overlapEnd > overlapStart) {
              dayMinutes -= (overlapEnd - overlapStart);
            }
          }
          
          if (dayMinutes > 0) {
            totalWorkingMinutes += dayMinutes;
            workingDays++;
          }
        }

        kpi.jamAbsen = Math.round((totalWorkingMinutes / 60) * 10) / 10; // Total jam kerja dalam periode
        console.log(`   ✅ Pegawai ${programmerId}: JA=${kpi.jamAbsen}h (${workingDays} hari kerja, break ${breakDurationMinutes}m/hari)`);
      } catch (err) {
        console.warn(`   ⚠️ Pegawai ${programmerId}: Jadwal API error - ${err instanceof Error ? err.message : 'Unknown'}`);
        // Fallback
        const daysDiff = Math.ceil((new Date(endDateForJadwal).getTime() - new Date(startDateForJadwal).getTime()) / (1000 * 60 * 60 * 24));
        const workingDays = Math.ceil((daysDiff / 7) * 5);
        kpi.jamAbsen = workingDays * 7;
      }
    }

    // Calculate rates and convert to array
    const data: ProgrammerKPI[] = Array.from(programmerMap.values()).map((kpi) => {
      kpi.projectCount = kpi.projects.length;
      kpi.completionRate = kpi.totalTasks > 0 ? Math.round((kpi.completedTasks / kpi.totalTasks) * 100) : 0;
      kpi.onTimeRate = (kpi.onTimeTasks + kpi.overdueTasks) > 0 
        ? Math.round((kpi.onTimeTasks / (kpi.onTimeTasks + kpi.overdueTasks)) * 100)
        : 0;
      kpi.avgCompletionTime = kpi.completedTasks > 0 ? kpi.jamSelesai / kpi.completedTasks : 0;
      kpi.productivity = kpi.totalEstimatedHours > 0 
        ? Math.round((kpi.totalActualHours / kpi.totalEstimatedHours) * 100)
        : 0;
      // SJ = JA - JS (Selisih jam absen dengan jam selesai)
      kpi.selisihJam = Math.round((kpi.jamAbsen - kpi.jamSelesai) * 10) / 10;
      return kpi;
    });

    // Calculate overall stats
    const overall: OverallStats = {
      totalProgrammers: data.length,
      totalTasks: data.reduce((sum, p) => sum + p.totalTasks, 0),
      totalCompleted: data.reduce((sum, p) => sum + p.completedTasks, 0),
      totalInProgress: data.reduce((sum, p) => sum + p.inProgressTasks, 0),
      totalOnTime: data.reduce((sum, p) => sum + p.onTimeTasks, 0),
      totalOverdue: data.reduce((sum, p) => sum + p.overdueTasks, 0),
      avgCompletionRate: data.length > 0 
        ? Math.round(data.reduce((sum, p) => sum + p.completionRate, 0) / data.length)
        : 0,
      avgOnTimeRate: data.length > 0
        ? Math.round(data.reduce((sum, p) => sum + p.onTimeRate, 0) / data.length)
        : 0,
      avgProductivity: data.length > 0
        ? Math.round(data.reduce((sum, p) => sum + p.productivity, 0) / data.length)
        : 0,
    };

    return NextResponse.json({
      success: true,
      data,
      overall,
    });
  } catch (error) {
    console.error('Error fetching KPI data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
}
