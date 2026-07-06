import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

const STATUS_MENUNGGU = 'MENUNGGU_PROSES_USER';
const STATUS_DIPROSES = 'SEDANG_DIPROSES_USER';
const STATUS_PAUSED = 'SEDANG_DIPROSES_USER_PAUSED';
const STATUS_REVIEW = 'MENUNGGU_REVIEW_PM';
const STATUS_SELESAI = 'SELESAI';

async function resolveModuleNames(moduleIds: Set<number>): Promise<Map<number, string>> {
  const ids = Array.from(moduleIds).filter((id) => id > 0);
  if (ids.length === 0) return new Map();
  const modules = await prisma.proyekModule.findMany({
    where: { id: { in: ids } },
    select: { id: true, nama: true },
  });
  const map = new Map<number, string>();
  for (const m of modules) map.set(m.id, m.nama);
  return map;
}

async function resolveProjectNames(projectIds: Set<number>): Promise<Map<number, string>> {
  const ids = Array.from(projectIds).filter((id) => id > 0);
  if (ids.length === 0) return new Map();
  const projects = await prisma.proyek.findMany({
    where: { id: { in: ids } },
    select: { id: true, namaProyek: true },
  });
  const map = new Map<number, string>();
  for (const p of projects) map.set(p.id, p.namaProyek);
  return map;
}

async function getPMDashboard(user: { id: number; role: string }) {
  let projectFilter: number[] | undefined;

  if (user.role === 'PM') {
    const teams = await prisma.proyekTeam.findMany({
      where: { pegawaiId: user.id },
      select: { projectId: true },
    });
    projectFilter = teams.map((t) => t.projectId);
  }

  const projects = await prisma.proyek.findMany({
    where: {
      isActive: true,
      ...(projectFilter ? { id: { in: projectFilter } } : {}),
    },
    include: {
      teamMembers: {
        include: { pegawai: { select: { id: true, namaLengkap: true } } },
      },
    },
  });

  const projectMap = new Map<number, string>();
  for (const p of projects) projectMap.set(p.id, p.namaProyek);

  const tasks = await prisma.tasklist.findMany({
    where: {
      projectId: projectFilter ? { in: projectFilter } : { not: undefined },
    },
    include: {
      pegawai: { select: { id: true, namaLengkap: true } },
    },
    orderBy: { scheduleAt: 'desc' },
  });

  const moduleIds = new Set(tasks.map((t) => t.moduleId));
  const moduleMap = await resolveModuleNames(moduleIds);

  const now = new Date();

  const projectStats = projects.map((p) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((t) => t.status === STATUS_SELESAI).length;
    const pendingReview = projectTasks.filter((t) => t.status === STATUS_REVIEW).length;
    const overdue = projectTasks.filter((t) => {
      if (t.status === STATUS_SELESAI) return false;
      return t.calculatedDueDate && new Date(t.calculatedDueDate) < now;
    }).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const teamSize = p.teamMembers.length;

    let status: 'on-track' | 'at-risk' | 'delayed' = 'on-track';
    if (overdue > 2) status = 'delayed';
    else if (overdue > 0) status = 'at-risk';

    return {
      id: p.id,
      name: p.namaProyek,
      totalTasks,
      completedTasks,
      pendingReview,
      progress,
      teamSize,
      status,
    };
  });

  const allTasks = tasks.map((t) => ({
    id: t.id,
    kode: t.kode,
    proyekNama: projectMap.get(t.projectId) || null,
    moduleNama: moduleMap.get(t.moduleId) || null,
    pegawaiId: t.pegawaiId,
    pegawaiNama: t.pegawai?.namaLengkap || null,
    status: t.status,
    taskComplexity: t.taskComplexity,
    scheduleAt: t.scheduleAt.toISOString(),
    calculatedDueDate: t.calculatedDueDate?.toISOString() || null,
    completedAt: t.status === STATUS_SELESAI ? t.updatedAt.toISOString() : null,
    projectId: t.projectId,
    isLate: t.calculatedDueDate ? new Date(t.calculatedDueDate) < now && t.status !== STATUS_SELESAI : false,
  }));

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todaysTasks = allTasks.filter((t) => t.scheduleAt.substring(0, 10) === todayStr);

  const totalTasks = tasks.length;
  const pendingReview = tasks.filter((t) => t.status === STATUS_REVIEW).length;
  const approved = tasks.filter((t) => t.status === STATUS_SELESAI).length;
  const rejected = 0;
  const overdue = tasks.filter((t) => {
    if (t.status === STATUS_SELESAI) return false;
    return t.calculatedDueDate && new Date(t.calculatedDueDate) < now;
  }).length;

  const userTeamMembership = await (prisma as any).masterTeamMember.findFirst({
    where: { pegawaiId: user.id },
    select: { teamId: true },
  });

  let uniqueTeamMembers: { id: number; name: string }[] = [];
  if (userTeamMembership) {
    const sameTeamMembers = await (prisma as any).masterTeamMember.findMany({
      where: { teamId: userTeamMembership.teamId },
      select: { pegawaiId: true },
    });
    const pegawaiIds = sameTeamMembers.map((m: any) => m.pegawaiId);
    if (pegawaiIds.length > 0) {
      const pegawaiList = await prisma.pegawai.findMany({
        where: { id: { in: pegawaiIds } },
        select: { id: true, namaLengkap: true },
      });
      uniqueTeamMembers = pegawaiList.map((p) => ({ id: p.id, name: p.namaLengkap }));
    }
  }

  return NextResponse.json({
    allTasks,
    todaysTasks,
    projects: projectStats,
    taskStats: { totalTasks, pendingReview, approved, rejected, overdue },
    teamMembers: uniqueTeamMembers,
  });
}

async function getProgrammerDashboard(user: { id: number }) {
  const tasks = await prisma.tasklist.findMany({
    where: { pegawaiId: user.id },
    orderBy: { scheduleAt: 'desc' },
  });

  const projectIds = new Set(tasks.map((t) => t.projectId));
  const projectMap = await resolveProjectNames(projectIds);
  const moduleIds = new Set(tasks.map((t) => t.moduleId));
  const moduleMap = await resolveModuleNames(moduleIds);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const today = new Date(todayStr);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const allTasks = tasks.map((t) => ({
    id: t.id,
    kode: t.kode,
    proyekNama: projectMap.get(t.projectId) || null,
    moduleNama: moduleMap.get(t.moduleId) || null,
    status: t.status,
    taskComplexity: t.taskComplexity,
    scheduleAt: t.scheduleAt.toISOString(),
    calculatedDueDate: t.calculatedDueDate?.toISOString() || null,
    completedAt: t.status === STATUS_SELESAI ? t.updatedAt.toISOString() : null,
    projectId: t.projectId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const myTasks = {
    pending: allTasks.filter((t) => t.status === STATUS_MENUNGGU),
    inProgress: allTasks.filter((t) => t.status === STATUS_DIPROSES || t.status === STATUS_PAUSED),
    waitingReview: allTasks.filter((t) => t.status === STATUS_REVIEW),
    completed: allTasks.filter((t) => t.status === STATUS_SELESAI),
  };

  const totalTasks = allTasks.length;
  const completedTasks = myTasks.completed.length;
  const overdueTasks = allTasks.filter((t) => {
    if (t.status === STATUS_SELESAI) return false;
    return t.calculatedDueDate && new Date(t.calculatedDueDate) < now;
  }).length;
  const todayTasks = allTasks.filter((t) => t.scheduleAt.substring(0, 10) === todayStr).length;
  const thisWeekTasks = allTasks.filter((t) => new Date(t.scheduleAt) >= weekStart).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const projectStatsMap = new Map<number, { id: number; name: string; totalTasks: number; completedTasks: number; pendingTasks: number }>();
  allTasks.forEach((t) => {
    if (!projectStatsMap.has(t.projectId)) {
      projectStatsMap.set(t.projectId, { id: t.projectId, name: t.proyekNama || '', totalTasks: 0, completedTasks: 0, pendingTasks: 0 });
    }
    const p = projectStatsMap.get(t.projectId)!;
    p.totalTasks++;
    if (t.status === STATUS_SELESAI) p.completedTasks++;
    else if (t.status === STATUS_MENUNGGU) p.pendingTasks++;
  });
  const projectStats = Array.from(projectStatsMap.values()).map((p) => ({
    ...p,
    progress: p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0,
  }));

  const complexityBreakdown = {
    easy: allTasks.filter((t) => t.taskComplexity === 'EASY').length,
    medium: allTasks.filter((t) => t.taskComplexity === 'MEDIUM').length,
    hard: allTasks.filter((t) => t.taskComplexity === 'HARD').length,
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyProgress = dayNames.map((day, idx) => {
    const dayTasks = allTasks.filter((t) => new Date(t.scheduleAt).getDay() === idx);
    return {
      day,
      completed: dayTasks.filter((t) => t.status === STATUS_SELESAI).length,
      assigned: dayTasks.length,
    };
  });

  const totalPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const onTimeRate = totalTasks > 0 ? Math.round(((completedTasks - overdueTasks) / totalTasks) * 100) : 0;

  return NextResponse.json({
    myTasks,
    taskStats: { totalTasks, completedTasks, overdueTasks, todayTasks, thisWeekTasks, completionRate },
    projectStats,
    complexityBreakdown,
    weeklyProgress,
    allTasks,
    kpi: {
      totalPercentage: Math.round(totalPercentage * 0.30 + onTimeRate * 0.40 + 20 + 10),
      taskSelesai: { percentage: totalPercentage, contribution: Math.round(totalPercentage * 0.30) },
      taskTepatWaktu: { percentage: onTimeRate, contribution: Math.round(onTimeRate * 0.40) },
      waktuPengerjaan: { percentage: 65, contribution: 13 },
      taskRevisi: { percentage: 80, contribution: 8 },
    },
  });
}

async function getGeneralDashboard() {
  const projects = await prisma.proyek.findMany({
    where: { isActive: true },
    include: {
      teamMembers: {
        include: { pegawai: { select: { id: true, namaLengkap: true } } },
      },
    },
  });

  const tasks = await prisma.tasklist.findMany({
    include: {
      pegawai: { select: { id: true, namaLengkap: true } },
    },
  });

  const now = new Date();
  const projectStages = [
    { stage: 'Blueprint', count: projects.filter((p) => p.type === 'BLUEPRINT').length, icon: 'clipboard', color: 'bg-blue-500' },
    { stage: 'Development', count: projects.filter((p) => p.type === 'DEVELOPMENT').length, icon: 'code', color: 'bg-purple-500' },
    { stage: 'UAT', count: 0, icon: 'check-circle', color: 'bg-green-500' },
    { stage: 'EUT/SIT', count: 0, icon: 'users', color: 'bg-orange-500' },
    { stage: 'Go-Live', count: 0, icon: 'rocket', color: 'bg-cyan-500' },
    { stage: 'Support', count: projects.filter((p) => p.type === 'SUPPORT').length, icon: 'wrench', color: 'bg-teal-500' },
  ];

  const mappedProjects = projects.map((p) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((t) => t.status === STATUS_SELESAI).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overdue = projectTasks.filter((t) => {
      if (t.status === STATUS_SELESAI) return false;
      return t.calculatedDueDate && new Date(t.calculatedDueDate) < now;
    }).length;
    const teamMembers = p.teamMembers.map((m) => ({
      name: m.pegawai.namaLengkap.charAt(0).toUpperCase(),
      avatar: 'bg-gray-400',
    }));

    return {
      id: p.id,
      name: p.namaProyek,
      progress,
      currentMilestone: 'Development',
      status: overdue > 0 ? ('at-risk' as const) : ('on-track' as const),
      team: teamMembers.slice(0, 5),
      timelineStatus: overdue > 0 ? ('late' as const) : ('on-time' as const),
      daysLate: overdue,
      overdueTaskCount: overdue,
    };
  });

  return NextResponse.json({
    projectStages,
    projects: mappedProjects,
    overdueTasks: [],
    slaViolations: { total: 0, pending: 0, completed: 0, violations: [] },
    supportTickets: { open: 0, completed: 0 },
  });
}

export async function GET() {
  try {
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role === 'PM' || user.role === 'SUPER_ADMIN') {
      return getPMDashboard(user);
    } else if (user.role === 'PROGRAMMER' || user.role === 'ADMIN') {
      return getProgrammerDashboard(user);
    } else {
      return getGeneralDashboard();
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
