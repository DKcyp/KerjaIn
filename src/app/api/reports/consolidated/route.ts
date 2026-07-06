import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type'); // 'project-summary', 'pm-report', 'programmer-admin'

    if (!reportType) {
      return NextResponse.json({ error: 'Report type is required' }, { status: 400 });
    }

    switch (reportType) {
      case 'project-summary':
        return await getProjectSummaryReport(session.user);
      case 'pm-report':
        return await getPMReport(session.user);
      case 'programmer-admin':
        return await getProgrammerAdminReport(session.user);
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in consolidated reports API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getProjectSummaryReport(user: any) {
  try {
    // Get all projects first
    let projects = await prisma.proyek.findMany();

    // Filter projects for PM users
    if (user.role === 'PM') {
      const pmProjectIds = await prisma.proyekTeam.findMany({
        where: { pegawaiId: user.id },
        select: { projectId: true }
      });
      const projectIds = pmProjectIds.map(pt => pt.projectId);
      projects = projects.filter(p => projectIds.includes(p.id));
    }

    // Get all related data in bulk
    const projectIds = projects.map(p => p.id);
    
    const [teamMembers, pegawaiData, modules, tasks, goLiveData] = await Promise.all([
      prisma.proyekTeam.findMany({
        where: { projectId: { in: projectIds } }
      }),
      prisma.pegawai.findMany({
        select: {
          id: true,
          namaLengkap: true,
          username: true,
          role: true
        }
      }),
      prisma.proyekModule.findMany({
        where: { projectId: { in: projectIds } }
      }),
      prisma.tasklist.findMany({
        where: { projectId: { in: projectIds } },
        select: {
          id: true,
          projectId: true,
          status: true,
          scheduleAt: true,
          totalDurationMinutes: true,
          calculatedDueDate: true
        }
      }),
      prisma.goLive.findMany({
        where: { projectId: { in: projectIds } },
        select: {
          projectId: true,
          actualGoLiveDate: true,
          status: true
        }
      })
    ]);

    // Create pegawai lookup map
    const pegawaiMap = new Map(pegawaiData.map(p => [p.id, p]));

    // Group data by project
    const teamByProject = new Map<number, any[]>();
    const modulesByProject = new Map<number, any[]>();
    const tasksByProject = new Map<number, any[]>();
    const goLiveByProject = new Map<number, any>();

    teamMembers.forEach(tm => {
      if (!teamByProject.has(tm.projectId)) teamByProject.set(tm.projectId, []);
      const pegawai = pegawaiMap.get(tm.pegawaiId);
      teamByProject.get(tm.projectId)!.push({ ...tm, pegawai });
    });

    modules.forEach(m => {
      if (!modulesByProject.has(m.projectId)) modulesByProject.set(m.projectId, []);
      modulesByProject.get(m.projectId)!.push(m);
    });

    tasks.forEach(t => {
      if (!tasksByProject.has(t.projectId)) tasksByProject.set(t.projectId, []);
      tasksByProject.get(t.projectId)!.push(t);
    });

    goLiveData.forEach(gl => {
      goLiveByProject.set(gl.projectId, gl);
    });

    const reportData = projects.map(project => {
      // Get project data from grouped maps
      const projectTeam = teamByProject.get(project.id) || [];
      const projectModules = modulesByProject.get(project.id) || [];
      const projectTasks = tasksByProject.get(project.id) || [];
      const projectGoLive = goLiveByProject.get(project.id);

      // Find Project Manager
      let projectManager = '-';
      const pm = projectTeam.find((member: any) => 
        member.jabatan?.toLowerCase().includes('pm') || 
        member.jabatan?.toLowerCase().includes('project manager') ||
        member.jabatan?.toLowerCase().includes('manager') ||
        member.pegawai?.role?.toLowerCase() === 'pm'
      );
      
      if (pm) {
        projectManager = pm.pegawai?.namaLengkap || pm.pegawai?.username || `User #${pm.pegawaiId}`;
      } else if (projectTeam.length > 0) {
        // Fallback to first team member
        const firstMember = projectTeam[0];
        projectManager = firstMember.pegawai?.namaLengkap || firstMember.pegawai?.username || `User #${firstMember.pegawaiId}`;
      }

      // Count modules
      const totalModul = projectModules.length;

      // Calculate task statistics
      const tasks = projectTasks;
      const totalTask = tasks.length;
      const completedTasks = tasks.filter((task: any) => task.status === 'SELESAI').length;
      
      // Calculate total manhours (convert from minutes to hours)
      const totalManhour = tasks.reduce((sum: number, task: any) => {
        return sum + (task.totalDurationMinutes || 0);
      }, 0) / 60;

      // Calculate total days (from first task to last task)
      let totalHari = 0;
      if (tasks.length > 0) {
        const dates = tasks
          .map((task: any) => new Date(task.scheduleAt))
          .filter((date: Date) => !isNaN(date.getTime()))
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());
        
        if (dates.length > 1) {
          const firstDate = dates[0];
          const lastDate = dates[dates.length - 1];
          const timeDiff = lastDate.getTime() - firstDate.getTime();
          totalHari = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        } else if (dates.length === 1) {
          totalHari = 1;
        }
      }

      // Calculate progress percentage
      const progres = totalTask > 0 ? Math.round((completedTasks / totalTask) * 100) : 0;

      // Determine project status based on project type
      let status = project.type; // BLUEPRINT, DEVELOPMENT, or SUPPORT

      // Calculate completion date (tanggalSelesai)
      let tanggalSelesai = null;
      
      if (project.type === 'SUPPORT' && projectGoLive?.tanggalGoLive) {
        // For SUPPORT projects, use Go Live date
        tanggalSelesai = new Date(projectGoLive.tanggalGoLive).toLocaleDateString('id-ID');
      } else if ((project.type === 'BLUEPRINT' || project.type === 'DEVELOPMENT') && tasks.length > 0) {
        // For BLUEPRINT and DEVELOPMENT, find the latest due date
        const dueDates = tasks
          .map((task: any) => task.calculatedDueDate || task.scheduleAt)
          .filter((date: any) => date)
          .map((date: any) => new Date(date))
          .filter((date: Date) => !isNaN(date.getTime()))
          .sort((a: Date, b: Date) => b.getTime() - a.getTime()); // Sort descending to get latest
        
        if (dueDates.length > 0) {
          tanggalSelesai = dueDates[0].toLocaleDateString('id-ID');
        }
      }

      return {
        namaProyek: project.namaProyek,
        projectManager,
        totalModul,
        totalTask,
        totalHari,
        totalManhour: Math.round(totalManhour * 100) / 100,
        progres,
        status,
        tanggalSelesai
      };
    });

    return NextResponse.json({ data: reportData });
  } catch (error) {
    console.error('Error in project summary report:', error);
    throw error;
  }
}

async function getPMReport(user: any) {
  try {
    // Get all projects first
    let projects = await prisma.proyek.findMany();

    // Filter projects for PM users
    if (user.role === 'PM') {
      const pmProjectIds = await prisma.proyekTeam.findMany({
        where: { pegawaiId: user.id },
        select: { projectId: true }
      });
      const projectIds = pmProjectIds.map(pt => pt.projectId);
      projects = projects.filter(p => projectIds.includes(p.id));
    }

    // Get all related data in bulk
    const projectIds = projects.map(p => p.id);
    
    const [teamMembers, pegawaiData, modules, tasks] = await Promise.all([
      prisma.proyekTeam.findMany({
        where: { projectId: { in: projectIds } }
      }),
      prisma.pegawai.findMany({
        select: {
          id: true,
          namaLengkap: true,
          username: true,
          role: true
        }
      }),
      prisma.proyekModule.findMany({
        where: { projectId: { in: projectIds } }
      }),
      prisma.tasklist.findMany({
        where: { projectId: { in: projectIds } },
        select: {
          id: true,
          projectId: true,
          status: true,
          scheduleAt: true,
          totalDurationMinutes: true
        }
      })
    ]);

    // Create pegawai lookup map
    const pegawaiMap = new Map(pegawaiData.map(p => [p.id, p]));

    // Group data by project
    const teamByProject = new Map<number, any[]>();
    const modulesByProject = new Map<number, any[]>();
    const tasksByProject = new Map<number, any[]>();

    teamMembers.forEach(tm => {
      if (!teamByProject.has(tm.projectId)) teamByProject.set(tm.projectId, []);
      const pegawai = pegawaiMap.get(tm.pegawaiId);
      teamByProject.get(tm.projectId)!.push({ ...tm, pegawai });
    });

    modules.forEach(m => {
      if (!modulesByProject.has(m.projectId)) modulesByProject.set(m.projectId, []);
      modulesByProject.get(m.projectId)!.push(m);
    });

    tasks.forEach(t => {
      if (!tasksByProject.has(t.projectId)) tasksByProject.set(t.projectId, []);
      tasksByProject.get(t.projectId)!.push(t);
    });

    // Group projects by PM
    const pmProjects = new Map<string, any[]>();

    projects.forEach(project => {
      const projectTeam = teamByProject.get(project.id) || [];
      let projectManager = '-';
      const pm = projectTeam.find((member: any) => 
        member.jabatan?.toLowerCase().includes('pm') || 
        member.jabatan?.toLowerCase().includes('project manager') ||
        member.jabatan?.toLowerCase().includes('manager') ||
        member.pegawai?.role?.toLowerCase() === 'pm'
      );
      if (pm) {
        projectManager = pm.pegawai?.namaLengkap || pm.pegawai?.username || `User #${pm.pegawaiId}`;
      }

      // Group by PM
      if (!pmProjects.has(projectManager)) {
        pmProjects.set(projectManager, []);
      }
      pmProjects.get(projectManager)!.push(project);
    });

    const reportData = Array.from(pmProjects.entries()).map(([pmName, pmProjectList]) => {
      let totalModul = 0;
      let totalTask = 0;
      let totalManhour = 0;
      let totalHari = 0;
      let totalProgres = 0;
      const projectCount = pmProjectList.length;

      pmProjectList.forEach(project => {
        const projectModules = modulesByProject.get(project.id) || [];
        const projectTasks = tasksByProject.get(project.id) || [];

        // Count modules
        totalModul += projectModules.length;

        // Calculate task statistics
        totalTask += projectTasks.length;
        
        const completedTasks = projectTasks.filter((task: any) => task.status === 'SELESAI').length;
        
        // Calculate manhours
        const projectManhour = projectTasks.reduce((sum: number, task: any) => {
          return sum + (task.totalDurationMinutes || 0);
        }, 0) / 60;
        totalManhour += projectManhour;

        // Calculate project progress
        const projectProgress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
        totalProgres += projectProgress;

        // Calculate project days
        if (projectTasks.length > 0) {
          const dates = projectTasks
            .map((task: any) => new Date(task.scheduleAt))
            .filter((date: Date) => !isNaN(date.getTime()))
            .sort((a: Date, b: Date) => a.getTime() - b.getTime());
          
          if (dates.length > 1) {
            const firstDate = dates[0];
            const lastDate = dates[dates.length - 1];
            const timeDiff = lastDate.getTime() - firstDate.getTime();
            totalHari += Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
          } else if (dates.length === 1) {
            totalHari += 1;
          }
        }
      });

      // Calculate average progress
      const rataRataProgres = projectCount > 0 ? Math.round(totalProgres / projectCount) : 0;

      // Determine performance rating
      let kinerja = 'Cukup Baik';
      if (rataRataProgres >= 90) {
        kinerja = 'Sempurna';
      } else if (rataRataProgres >= 80) {
        kinerja = 'Sangat Baik';
      } else if (rataRataProgres >= 60) {
        kinerja = 'Cukup Baik';
      } else {
        kinerja = 'Perlu Perbaikan';
      }

      return {
        projectManager: pmName,
        jumlahProyek: projectCount,
        totalModul,
        totalTask,
        totalHari,
        totalManhour: Math.round(totalManhour * 100) / 100,
        rataRataProgres,
        kinerja
      };
    });

    // Sort by average progress descending
    reportData.sort((a, b) => b.rataRataProgres - a.rataRataProgres);

    return NextResponse.json({ data: reportData });
  } catch (error) {
    console.error('Error in PM report:', error);
    throw error;
  }
}

async function getProgrammerAdminReport(user: any) {
  try {
    // Get all programmers and admins with their tasks in one query
    const programmersAndAdmins = await prisma.pegawai.findMany({
      where: {
        role: {
          in: ['PROGRAMMER', 'ADMIN']
        }
      }
    });

    // Get all tasks for these users
    const pegawaiIds = programmersAndAdmins.map(p => p.id);
    const tasks = await prisma.tasklist.findMany({
      where: {
        pegawaiId: { in: pegawaiIds }
      },
      select: {
        id: true,
        pegawaiId: true,
        status: true,
        totalDurationMinutes: true
      }
    });

    // Group tasks by pegawai
    const tasksByPegawai = new Map<number, any[]>();
    tasks.forEach(task => {
      if (!tasksByPegawai.has(task.pegawaiId)) tasksByPegawai.set(task.pegawaiId, []);
      tasksByPegawai.get(task.pegawaiId)!.push(task);
    });

    const reportData = programmersAndAdmins.map(pegawai => {
      const pegawaiTasks = tasksByPegawai.get(pegawai.id) || [];
      const totalTask = pegawaiTasks.length;
      const taskSelesai = pegawaiTasks.filter((task: any) => task.status === 'SELESAI').length;
      
      // Calculate total manhours
      const totalManhour = pegawaiTasks.reduce((sum: number, task: any) => {
        return sum + (task.totalDurationMinutes || 0);
      }, 0) / 60;

      // Calculate progress percentage
      const progres = totalTask > 0 ? Math.round((taskSelesai / totalTask) * 100) : 0;

      // Determine performance rating
      let kinerja = 'Cukup Baik';
      if (progres >= 90) {
        kinerja = 'Sempurna';
      } else if (progres >= 80) {
        kinerja = 'Sangat Baik';
      } else if (progres >= 60) {
        kinerja = 'Cukup Baik';
      } else {
        kinerja = 'Perlu Perbaikan';
      }

      return {
        namaLengkap: pegawai.namaLengkap || pegawai.username || `User #${pegawai.id}`,
        role: pegawai.role || '-',
        totalTask,
        taskSelesai,
        progres,
        totalManhour: Math.round(totalManhour * 100) / 100,
        kinerja
      };
    });

    // Sort by progress descending
    reportData.sort((a, b) => b.progres - a.progres);

    return NextResponse.json({ data: reportData });
  } catch (error) {
    console.error('Error in programmer/admin report:', error);
    throw error;
  }
}
