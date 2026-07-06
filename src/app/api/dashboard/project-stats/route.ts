import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Dashboard API called at:', new Date().toISOString());

    // Test database connection first
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError);
      throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown DB error'}`);
    }

    // Get user session for permission checking
    const token = (await cookies()).get("session")?.value;
    const session = verifySession(token || null);

    console.log('🔐 Session check:', { hasSession: !!session, userId: session?.id, role: session?.role });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine project scope based on user role
    let scopedProjectIds: number[] | null = null;
    if (session.role === "PM") {
      const teams = await prisma.proyekTeam.findMany({
        where: { pegawaiId: session.id },
        select: { projectId: true },
      });
      scopedProjectIds = Array.from(new Set(teams.map((t) => t.projectId)));
      if (scopedProjectIds.length === 0) scopedProjectIds = [];
    }

    const whereProjectScope = scopedProjectIds ? { id: { in: scopedProjectIds } } : {};

    // Get active development project IDs first
    const activeDevelopmentTasks = await prisma.tasklist.findMany({
      where: {
        projectId: scopedProjectIds ? { in: scopedProjectIds } : undefined,
        status: { in: ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER'] }
      },
      select: { projectId: true }
    });
    const activeDevelopmentProjectIds = [...new Set(activeDevelopmentTasks.map(t => t.projectId))];

    // Fetch project stage statistics based on project type
    const [
      blueprintProjects,
      developmentProjects,
      uatProjects,
      eutProjects,
      goLiveProjects,
      supportProjects
    ] = await Promise.all([
      // Blueprint stage: Projects with type BLUEPRINT only
      prisma.proyek.count({
        where: {
          ...whereProjectScope,
          type: 'BLUEPRINT'
        }
      }),

      // Development stage: Projects with type DEVELOPMENT only
      prisma.proyek.count({
        where: {
          ...whereProjectScope,
          type: 'DEVELOPMENT'
        }
      }),

      // UAT stage: Projects with UAT tests (since UAT is not a project type)
      prisma.proyek.count({
        where: {
          ...whereProjectScope,
          uatTests: {
            some: {}
          }
        }
      }),

      // EUT stage: Projects with EUT tests (since EUT is not a project type)
      prisma.proyek.count({
        where: {
          ...whereProjectScope,
          eutTests: {
            some: {}
          }
        }
      }),

      // Go-Live stage: Projects with go-live records (since GOLIVE is not a project type)
      prisma.proyek.count({
        where: {
          ...whereProjectScope,
          goLive: {
            isNot: null
          }
        }
      }),

      // Support stage: Projects with completed go-live (since SUPPORT is not a project type)
      prisma.proyek.count({
        where: {
          ...whereProjectScope,
          goLive: {
            status: 'COMPLETED'
          }
        }
      })
    ]);

    // Fetch recent projects with progress data
    const recentProjects = await prisma.proyek.findMany({
      where: whereProjectScope,
      include: {
        blueprints: {
          select: {
            blueprintStatus: true
          }
        },
        _count: {
          select: {
            uatTests: true,
            eutTests: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    });

    // Calculate progress and status for each project
    const projectsWithProgress = await Promise.all(
      recentProjects.map(async (project) => {
        // Get task statistics for this project
        const taskStats = await prisma.tasklist.groupBy({
          by: ['status'],
          _count: { _all: true },
          where: {
            projectId: project.id
          }
        });

        const totalTasks = taskStats.reduce((sum, stat) => sum + stat._count._all, 0);
        const completedTasks = taskStats.find(stat => stat.status === 'SELESAI')?._count._all || 0;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Determine current milestone and status
        let currentMilestone = 'Planning';
        let status: 'on-track' | 'at-risk' | 'delayed' = 'on-track';

        if (project.blueprints.length > 0) {
          const blueprintStatus = project.blueprints[0].blueprintStatus;
          if (blueprintStatus === 'DRAFT') {
            currentMilestone = 'Blueprint Design';
          } else if (blueprintStatus === 'APPROVED') {
            currentMilestone = 'Development';
          }
        }

        if (project._count.uatTests > 0) {
          currentMilestone = 'UAT Testing';
        }

        if (project._count.eutTests > 0) {
          currentMilestone = 'EUT Testing';
        }

        // Simple status logic based on progress
        if (progress < 25) {
          status = 'delayed';
        } else if (progress < 75) {
          status = 'at-risk';
        }

        // Get team members for this project
        const teamMembers = await prisma.proyekTeam.findMany({
          where: { projectId: project.id },
          take: 3
        });

        // Get pegawai details for team members
        const pegawaiIds = teamMembers.map(member => member.pegawaiId);
        const pegawaiDetails = await prisma.pegawai.findMany({
          where: { id: { in: pegawaiIds } },
          select: { id: true, namaLengkap: true, role: true }
        });

        const team = teamMembers.map((member, idx) => {
          const pegawai = pegawaiDetails.find(p => p.id === member.pegawaiId);
          return {
            name: pegawai?.namaLengkap?.split(' ').map((n: string) => n[0]).join('') || 'U',
            avatar: `bg-${['blue', 'purple', 'green', 'orange', 'pink', 'indigo'][idx % 6]}-500`
          };
        });

        // Calculate timeline status based on overdue tasks
        const overdueTasks = await prisma.tasklist.count({
          where: {
            projectId: project.id,
            calculatedDueDate: {
              not: null,
              lt: new Date()
            },
            status: { not: 'SELESAI' }
          }
        });

        // Get oldest overdue task to calculate days late
        const oldestOverdue = await prisma.tasklist.findFirst({
          where: {
            projectId: project.id,
            calculatedDueDate: {
              not: null,
              lt: new Date()
            },
            status: { not: 'SELESAI' }
          },
          orderBy: { calculatedDueDate: 'asc' },
          select: { calculatedDueDate: true }
        });

        const daysLate = oldestOverdue?.calculatedDueDate
          ? Math.ceil((new Date().getTime() - oldestOverdue.calculatedDueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        const timelineStatus = overdueTasks > 0 ? 'late' : 'on-time';

        return {
          id: project.id,
          name: project.namaProyek,
          progress,
          currentMilestone,
          status,
          team,
          timelineStatus,
          daysLate,
          overdueTaskCount: overdueTasks
        };
      })
    );

    // Fetch overdue tasks
    const overdueTasks = await prisma.tasklist.findMany({
      where: {
        projectId: scopedProjectIds ? { in: scopedProjectIds } : undefined,
        scheduleAt: {
          lt: new Date()
        },
        status: {
          in: ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER']
        }
      },
      orderBy: {
        scheduleAt: 'asc'
      },
      take: 10
    });

    // Get project, PM, and programmer details for overdue tasks
    const overdueProjectIds = [...new Set(overdueTasks.map(task => task.projectId))];
    const overdueProgrammerIds = [...new Set(overdueTasks.map(task => task.pegawaiId))];

    const [overdueProjects, projectTeams, programmers] = await Promise.all([
      prisma.proyek.findMany({
        where: { id: { in: overdueProjectIds } },
        select: { id: true, namaProyek: true }
      }),
      prisma.proyekTeam.findMany({
        where: { projectId: { in: overdueProjectIds } },
        select: { projectId: true, pegawaiId: true, jabatan: true }
      }),
      prisma.pegawai.findMany({
        where: { id: { in: overdueProgrammerIds } },
        select: { id: true, namaLengkap: true }
      })
    ]);

    // Get PM pegawai IDs from project teams
    const pmPegawaiIds = projectTeams
      .filter(t => t.jabatan?.toLowerCase().includes('pm'))
      .map(t => t.pegawaiId);

    // Fetch PM pegawai details
    const pmPegawais = await prisma.pegawai.findMany({
      where: { id: { in: pmPegawaiIds } },
      select: { id: true, namaLengkap: true }
    });

    const overdueTasksFormatted = overdueTasks.map(task => {
      const daysOverdue = Math.ceil((new Date().getTime() - task.scheduleAt.getTime()) / (1000 * 60 * 60 * 24));
      const project = overdueProjects.find(p => p.id === task.projectId);

      // Find PM for this project
      const pmTeam = projectTeams.find(t =>
        t.projectId === task.projectId &&
        t.jabatan?.toLowerCase().includes('pm')
      );
      const pm = pmTeam ? pmPegawais.find(p => p.id === pmTeam.pegawaiId) : null;

      // Find programmer
      const programmer = programmers.find(p => p.id === task.pegawaiId);

      return {
        id: task.id,
        taskName: task.keterangan || `Task ${task.kode}`,
        projectName: project?.namaProyek || 'Unknown Project',
        programmerName: programmer?.namaLengkap || 'Unassigned',
        pmName: pm?.namaLengkap || 'No PM',
        daysOverdue
      };
    });

    // Fetch SLA violations (tasks exceeding calculatedDueDate)
    const now = new Date();
    const slaViolations = await prisma.tasklist.findMany({
      where: {
        projectId: scopedProjectIds ? { in: scopedProjectIds } : undefined,
        calculatedDueDate: {
          not: null,
          lt: now  // Due date has passed
        }
      },
      select: {
        id: true,
        kode: true,
        status: true,
        calculatedDueDate: true,
        taskComplexity: true,
        keterangan: true
      },
      orderBy: {
        calculatedDueDate: 'asc'
      },
      take: 50
    });

    // Get task complexity details for display
    const complexities = await prisma.taskComplexity.findMany({
      where: { isActive: true },
      select: { complexity: true, hours: true }
    });
    const complexityMap = new Map(complexities.map(c => [c.complexity, c.hours]));

    // Group by status
    const slaStats = {
      total: slaViolations.length,
      pending: slaViolations.filter(t =>
        t.status !== 'SELESAI'
      ).length,
      completed: slaViolations.filter(t =>
        t.status === 'SELESAI'
      ).length,
      violations: slaViolations.slice(0, 20).map(task => {
        const daysOverdue = Math.ceil(
          (now.getTime() - task.calculatedDueDate!.getTime()) / (1000 * 60 * 60 * 24)
        );
        const slaHours = complexityMap.get(task.taskComplexity) || 0;

        return {
          id: task.id,
          taskCode: task.kode,
          taskName: task.keterangan || `Task ${task.kode}`,
          status: task.status,
          dueDate: task.calculatedDueDate,
          complexity: task.taskComplexity,
          slaHours: slaHours,
          daysOverdue: daysOverdue
        };
      })
    };

    // Support tickets (mock data for now - can be replaced with real data later)
    const supportTickets = {
      open: 24,
      completed: 156
    };

    const response = {
      projectStages: [
        { stage: "Blueprint", count: blueprintProjects, icon: "clipboard", color: "bg-blue-500" },
        { stage: "Development", count: developmentProjects, icon: "code", color: "bg-purple-500" },
        { stage: "UAT", count: uatProjects, icon: "check-circle", color: "bg-orange-500" },
        { stage: "EUT/SIT", count: eutProjects, icon: "users", color: "bg-teal-500" },
        { stage: "Go-Live", count: goLiveProjects, icon: "rocket", color: "bg-green-500" },
        { stage: "Support", count: supportProjects, icon: "wrench", color: "bg-cyan-500" }
      ],
      projects: projectsWithProgress,
      overdueTasks: overdueTasksFormatted,
      slaViolations: slaStats,
      supportTickets
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('🚨 Dashboard API error - DETAILED:', {
      errorMessage: error instanceof Error ? error.message : error,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : 'Unknown',
      timestamp: new Date().toISOString(),
      url: request.url
    });
    console.error('🚨 Full Error Object:', error);

    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Internal server error',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
