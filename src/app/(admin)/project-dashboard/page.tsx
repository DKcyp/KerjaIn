"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PMDashboard from "@/components/dashboard/PMDashboard";
import TeamKPISection from "@/components/dashboard/TeamKPISection";

// Types
interface ProjectStage {
  stage: "Blueprint" | "Development" | "UAT" | "EUT/SIT" | "Go-Live" | "Support";
  count: number;
  icon: string;
  color: string;
}

interface Project {
  id: number;
  name: string;
  progress: number;
  currentMilestone: string;
  status: "on-track" | "at-risk" | "delayed";
  team: { name: string; avatar: string }[];
  timelineStatus: "on-time" | "late";
  daysLate: number;
  overdueTaskCount: number;
}

interface OverdueTask {
  id: number;
  taskName: string;
  projectName: string;
  programmerName: string;
  pmName: string;
  daysOverdue: number;
}

interface SlaViolation {
  id: number;
  taskCode: string;
  taskName: string;
  status: string;
  dueDate: Date;
  complexity: string;
  slaHours: number;
  daysOverdue: number;
}

interface SlaStats {
  total: number;
  pending: number;
  completed: number;
  violations: SlaViolation[];
}

interface DashboardData {
  projectStages: ProjectStage[];
  projects: Project[];
  overdueTasks: OverdueTask[];
  slaViolations: SlaStats;
  supportTickets: {
    open: number;
    completed: number;
  };
}

// Types for Programmer Dashboard
interface ProgrammerTask {
  id: number;
  kode: string;
  proyekNama: string;
  moduleNama: string;
  scheduleAt: string;
  status: string;
  taskComplexity: string;
  calculatedDueDate?: string;
  projectId: number;
  completedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ProjectStats {
  id: number;
  name: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  progress: number;
}

interface ProgrammerDashboardData {
  myTasks: {
    pending: ProgrammerTask[];
    inProgress: ProgrammerTask[];
    waitingReview: ProgrammerTask[];
    completed: ProgrammerTask[];
  };
  taskStats: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    todayTasks: number;
    thisWeekTasks: number;
    completionRate: number;
  };
  projectStats: ProjectStats[];
  complexityBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
  weeklyProgress: {
    day: string;
    completed: number;
    assigned: number;
  }[];
  allTasks?: any[];
}

export default function ProjectDashboardPage() {
  const { user } = useAuth();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [programmerData, setProgrammerData] = useState<ProgrammerDashboardData | null>(null);
  const [pmData, setPmData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // KPI State
  const [kpiData, setKpiData] = useState<any>(null);

  // Team KPI State (for PM and Super Admin)
  const [teamMembers, setTeamMembers] = useState<Array<{ id: number; name: string }>>([]);

  const todayProg = new Date();
  const startMonth = new Date(todayProg.getFullYear(), todayProg.getMonth() - 1, 25);
  const startProgDate = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}-25`;
  const endProgDate = `${todayProg.getFullYear()}-${String(todayProg.getMonth() + 1).padStart(2, '0')}-24`;
  const progPeriodLabel = `${new Date(startProgDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} - ${new Date(endProgDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const isProgrammer = user?.role === 'PROGRAMMER' || user?.role === 'ADMIN';
  const isPM = user?.role === 'PM' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    setLoading(true);

    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/project-dashboard', { credentials: 'include' });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || 'Gagal memuat data dashboard');
        }
        const data = await res.json();

        if (isPM || user.role === 'SUPER_ADMIN') {
          setPmData(data);
          setTeamMembers(data.teamMembers || []);
        } else if (isProgrammer) {
          setProgrammerData(data);
          if (data.kpi) setKpiData({ kpi: data.kpi });
        } else {
          setDashboardData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [isPM, isProgrammer, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || (!isPM && !isProgrammer && !dashboardData) || (isProgrammer && !programmerData) || (isPM && !pmData)) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Gagal memuat dashboard'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // PM Dashboard
  if (isPM && pmData) {
    return (
      <div className="space-y-6">
        <PMDashboard data={pmData} teamMembers={teamMembers} />
      </div>
    );
  }

  // Programmer Dashboard
  if (isProgrammer && programmerData) {
    const filteredProgStats = (() => {
      if (!programmerData.allTasks) return null;
      const filteredTasks = programmerData.allTasks.filter((t: any) => {
        const targetDate = t.scheduleAt || t.updatedAt || t.createdAt;
        if (!targetDate) return false;
        const d = new Date(targetDate);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const taskDateStr = `${y}-${m}-${day}`;
        
        let isValid = true;
        if (startProgDate && taskDateStr < startProgDate) isValid = false;
        if (endProgDate && taskDateStr > endProgDate) isValid = false;
        return isValid;
      });

      const completed = filteredTasks.filter((t: any) => t.status === 'SELESAI');
      const pending = filteredTasks.filter((t: any) => t.status === 'MENUNGGU_PROSES_USER');
      const inProgress = filteredTasks.filter((t: any) => t.status === 'SEDANG_DIPROSES_USER' || t.status === 'SEDANG_DIPROSES_USER_PAUSED');
      const waitingReview = filteredTasks.filter((t: any) => t.status === 'MENUNGGU_REVIEW_PM');
      
      const overdueTasks = filteredTasks.filter((t: any) => {
        const due = t.calculatedDueDate ? new Date(t.calculatedDueDate) : null;
        return due && due < new Date() && t.status !== 'SELESAI';
      }).length;

      const totalTasks = filteredTasks.length;
      const completedTasks = completed.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const onTimeRate = totalTasks > 0 ? Math.round(((completedTasks - overdueTasks) / totalTasks) * 100) : 0;

      const taskCompletionScore = Math.round(completionRate * 0.30);
      const onTimeDeliveryScore = Math.round(onTimeRate * 0.40);
      const complexityScore = 20; // Default max
      const qualityScore = 10; // Default max
      const totalKpiScore = taskCompletionScore + onTimeDeliveryScore + complexityScore + qualityScore;

      const projectMap = new Map();
      filteredTasks.forEach((t: any) => {
        const pid = t.projectId;
        if (!projectMap.has(pid)) {
          projectMap.set(pid, {
            id: pid,
            name: t.proyekNama,
            total: 0,
            completed: 0,
            inProgress: 0,
            incomplete: 0,
            overdue: 0
          });
        }
        const p = projectMap.get(pid);
        p.total++;
        if (t.status === 'SELESAI') {
          p.completed++;
        } else {
          p.incomplete++;
          if (t.status === 'SEDANG_DIPROSES_USER' || t.status === 'SEDANG_DIPROSES_USER_PAUSED') {
            p.inProgress++;
          }
          const due = t.calculatedDueDate ? new Date(t.calculatedDueDate) : null;
          if (due && due < new Date()) {
            p.overdue++;
          }
        }
      });
      const projectDetailedStats = Array.from(projectMap.values());

      return {
        totalTasks,
        completedTasks,
        pending: pending.length,
        inProgress: inProgress.length,
        waitingReview: waitingReview.length,
        overdueTasks,
        completionRate,
        onTimeRate,
        taskCompletionScore,
        onTimeDeliveryScore,
        complexityScore,
        qualityScore,
        totalKpiScore,
        projectDetailedStats
      };
    })();

    const defaultCompletionRate = programmerData.taskStats.completionRate;
    const defaultOnTimeRate = programmerData.taskStats.totalTasks > 0 ? Math.round(((programmerData.taskStats.completedTasks - programmerData.taskStats.overdueTasks) / programmerData.taskStats.totalTasks) * 100) : 0;
    const stats = filteredProgStats || {
      totalTasks: programmerData.taskStats.totalTasks,
      completedTasks: programmerData.taskStats.completedTasks,
      pending: programmerData.myTasks.pending.length,
      inProgress: programmerData.myTasks.inProgress.length,
      waitingReview: programmerData.myTasks.waitingReview.length,
      overdueTasks: programmerData.taskStats.overdueTasks,
      completionRate: defaultCompletionRate,
      onTimeRate: defaultOnTimeRate,
      taskCompletionScore: Math.round(defaultCompletionRate * 0.30),
      onTimeDeliveryScore: Math.round(defaultOnTimeRate * 0.40),
      complexityScore: 20,
      qualityScore: 10,
      totalKpiScore: Math.round(defaultCompletionRate * 0.30) + Math.round(defaultOnTimeRate * 0.40) + 20 + 10,
      projectDetailedStats: []
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard Proyek</h1>

        {/* Statistics Cards Header with Period Filter */}
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Statistik Task</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">Periode: {progPeriodLabel}</span>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link href={`/tasklist?from=${startProgDate}&to=${endProgDate}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-brand-300 dark:hover:border-brand-600 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Total Tasklist</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalTasks}</p>
              </div>
              <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-lg">
                <svg className="w-5 h-5 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </Link>
          <Link href={`/tasklist?status=MENUNGGU_PROSES_USER&from=${startProgDate}&to=${endProgDate}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Belum Dikerjakan</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pending}</p>
              </div>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Link>
          <Link href={`/tasklist?status=SEDANG_DIPROSES_USER&from=${startProgDate}&to=${endProgDate}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-light-300 dark:hover:border-blue-light-600 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Sedang Dikerjakan</p>
                <p className="text-2xl font-bold text-blue-light-600 dark:text-blue-light-400">{stats.inProgress}</p>
              </div>
              <div className="p-2 bg-blue-light-50 dark:bg-blue-light-500/10 rounded-lg">
                <svg className="w-5 h-5 text-blue-light-500 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </Link>
          <Link href={`/tasklist?status=MENUNGGU_REVIEW_PM&from=${startProgDate}&to=${endProgDate}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-warning-300 dark:hover:border-warning-600 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Menunggu Review PM</p>
                <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">{stats.waitingReview}</p>
              </div>
              <div className="p-2 bg-warning-50 dark:bg-warning-500/10 rounded-lg">
                <svg className="w-5 h-5 text-warning-500 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Link>
          <Link href={`/tasklist?status=SELESAI&from=${startProgDate}&to=${endProgDate}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-success-300 dark:hover:border-success-600 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Selesai</p>
                <p className="text-2xl font-bold text-success-600 dark:text-success-400">{stats.completedTasks}</p>
              </div>
              <div className="p-2 bg-success-50 dark:bg-success-500/10 rounded-lg">
                <svg className="w-5 h-5 text-success-500 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </Link>
          <Link href={`/tasklist?status=TERLAMBAT&from=${startProgDate}&to=${endProgDate}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-error-300 dark:hover:border-error-600 transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Terlambat</p>
                <p className="text-2xl font-bold text-error-600 dark:text-error-400">{stats.overdueTasks}</p>
              </div>
              <div className="p-2 bg-error-50 dark:bg-error-500/10 rounded-lg">
                <svg className="w-5 h-5 text-error-500 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Activity Heatmap and Project Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KPI Dashboard */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-theme-sm border border-gray-200 dark:border-gray-700 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              <span className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-lg">
                <svg className="w-5 h-5 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              KPI
            </h3>
            
            {kpiData ? (
              <>


                <div className="flex items-center flex-1">
                  {/* Left Side: Big Percentage */}
                  <div className="w-1/3 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-700">
                    <span className="text-5xl font-bold text-brand-600 dark:text-brand-400">{kpiData.kpi.totalPercentage}%</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center font-medium">Total<br/>KPI</span>
                  </div>
                  
                  {/* Right Side: Indicators */}
                  <div className="w-2/3 pl-8 flex flex-col justify-center">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 text-sm">Task Selesai (30%)</span>
                      <div className="text-right">
                        <span className="font-bold text-brand-600 dark:text-brand-400">{kpiData.kpi.taskSelesai.percentage.toFixed(1)}%</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">→ {kpiData.kpi.taskSelesai.contribution.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 text-sm">Task Tepat Waktu (40%)</span>
                      <div className="text-right">
                        <span className="font-bold text-brand-600 dark:text-brand-400">{kpiData.kpi.taskTepatWaktu.percentage.toFixed(1)}%</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">→ {kpiData.kpi.taskTepatWaktu.contribution.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 text-sm">Waktu Pengerjaan (20%)</span>
                      <div className="text-right">
                        <span className="font-bold text-brand-600 dark:text-brand-400">{kpiData.kpi.waktuPengerjaan.percentage.toFixed(1)}%</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">→ {kpiData.kpi.waktuPengerjaan.contribution.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-700 dark:text-gray-300 text-sm">Task Revisi (10%)</span>
                      <div className="text-right">
                        <span className="font-bold text-brand-600 dark:text-brand-400">{kpiData.kpi.taskRevisi.percentage.toFixed(1)}%</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">→ {kpiData.kpi.taskRevisi.contribution.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pilih periode untuk melihat KPI</p>
                </div>
              </div>
            )}
          </div>

          {/* Project Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-theme-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-lg">
                <svg className="w-5 h-5 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              Penugasan Proyek ({programmerData.projectStats.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {programmerData.projectStats.slice(0, 6).map((project) => (
                <Link key={project.id} href={`/tasklist?projectId=${project.id}`} className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-brand-300 dark:hover:border-brand-600 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{project.name}</h4>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{project.progress}%</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-brand-500 dark:bg-brand-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>{project.completedTasks}/{project.totalTasks} selesai</span>
                    <span>{project.pendingTasks} tertunda</span>
                  </div>
                </Link>
              ))}
              {programmerData.projectStats.length > 6 && (
                <div className="text-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    +{programmerData.projectStats.length - 6} proyek lainnya
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Dashboard for other roles
  if (!dashboardData) {
    return null; // This should not happen due to error check above, but satisfies TypeScript
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getStatusBadge = (status: Project["status"]) => {
    const config = {
      "on-track": { label: "Sesuai Jalur", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
      "at-risk": { label: "Berisiko", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
      delayed: { label: "Terlambat", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    };
    return config[status];
  };

  const getStageIcon = (iconName: string) => {
    const iconClass = "w-8 h-8 text-white";

    switch (iconName) {
      case "clipboard":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case "code":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case "check-circle":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "users":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case "rocket":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case "wrench":
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard Manajemen Proyek
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ringkasan tingkat tinggi dari semua aktivitas proyek
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Terakhir diperbarui: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Widget 1: Project Stage Funnel - 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {dashboardData.projectStages.map((stage) => (
          <button
            key={stage.stage}
            onClick={() => setSelectedStage(selectedStage === stage.stage ? null : stage.stage)}
            className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg bg-white dark:bg-gray-800 ${selectedStage === stage.stage
              ? "border-brand-500 shadow-lg"
              : "border-gray-200 dark:border-gray-700"
              }`}
          >
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                {/* Circular Icon Background */}
                <div className={`w-16 h-16 rounded-full ${stage.color} flex items-center justify-center mb-4`}>
                  {getStageIcon(stage.icon)}
                </div>
                {/* Count */}
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {stage.count}
                </div>
                {/* Stage Name */}
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stage.stage}
                </div>
                {/* Subtitle */}
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Proyek Aktif
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 2: Project Progress Overview (Takes 2 columns) */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Ringkasan Progres Proyek
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Pantau proyek utama dan pencapaiannya
                </p>
              </div>
              <Link
                href="/blueprint"
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Lihat Semua →
              </Link>
            </div>

            <div className="space-y-4">
              {dashboardData.projects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {project.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(project.status).color
                            }`}
                        >
                          {getStatusBadge(project.status).label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Milestone Saat Ini: <span className="font-medium">{project.currentMilestone}</span>
                      </p>
                      {/* Timeline Status */}
                      <div className="flex items-center gap-2 mt-1">
                        {project.timelineStatus === 'late' ? (
                          <>
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                              Terlambat {project.daysLate} hari ({project.overdueTaskCount} tugas)
                            </span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Sesuai Timeline
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex -space-x-2 overflow-hidden">
                      {project.team.slice(0, 3).map((member, idx) => (
                        <div
                          key={idx}
                          className={`w-8 h-8 rounded-full ${member.avatar} flex items-center justify-center text-white text-xs font-semibold border-2 border-white dark:border-gray-800 flex-shrink-0`}
                          title={member.name}
                        >
                          {member.name}
                        </div>
                      ))}
                      {project.team.length > 3 && (
                        <div
                          className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white dark:border-gray-800 flex-shrink-0"
                          title={`+${project.team.length - 3} anggota lainnya`}
                        >
                          +{project.team.length - 3}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Progres</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`${getProgressColor(project.progress)} h-3 rounded-full transition-all duration-500 relative overflow-hidden`}
                        style={{ width: `${project.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Support Tickets & Overdue Tasks */}
        <div className="space-y-6">
          {/* Widget 3: Support Ticket Snapshot */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Tiket Dukungan
            </h2>

            <div className="space-y-4">
              {/* Open Tickets */}
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                        Tiket Terbuka
                      </div>
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                        {dashboardData.supportTickets.open}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completed Tickets */}
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm text-green-700 dark:text-green-300 font-medium">
                        Tiket Selesai
                      </div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {dashboardData.supportTickets.completed}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Donut Chart Visualization */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      {/* Completed tickets arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeDasharray={`${(dashboardData.supportTickets.completed / (dashboardData.supportTickets.open + dashboardData.supportTickets.completed)) * 251.2} 251.2`}
                        className="text-green-500 transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {dashboardData.supportTickets.open + dashboardData.supportTickets.completed}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 4: Overdue Task Reminders */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-red-200 dark:border-red-800">
            <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
                    Task Lewat Tenggat
                  </h2>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {dashboardData.overdueTasks.length} tugas butuh perhatian segera
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {dashboardData.overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                          {task.taskName}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {task.projectName}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">PM:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{task.pmName}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 dark:text-gray-400">Programmer:</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{task.programmerName}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-600 text-white text-xs font-semibold">
                          Terlambat {task.daysOverdue} hari
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Widget 5: SLA Violations */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-orange-200 dark:border-orange-800">
            <div className="bg-orange-50 dark:bg-orange-900/20 px-6 py-4 border-b border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                    Tiket Melebihi SLA
                  </h2>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {dashboardData.slaViolations.total} tugas melebihi Target PM
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {dashboardData.slaViolations.pending}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Masih Pending
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {dashboardData.slaViolations.completed}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Sudah Selesai
                  </div>
                </div>
              </div>

              {/* Violation List */}
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {dashboardData.slaViolations.violations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">Semua tugas sesuai SLA</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada pelanggaran saat ini</p>
                  </div>
                ) : (
                  dashboardData.slaViolations.violations.map((violation) => (
                    <div key={violation.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                              {violation.taskCode}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${violation.complexity === 'EASY' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              violation.complexity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              {violation.complexity === 'EASY' ? 'Mudah' : violation.complexity === 'MEDIUM' ? 'Sedang' : 'Sulit'} ({violation.slaHours} jam)
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {violation.taskName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${violation.status === 'SELESAI'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              {violation.status === 'SELESAI' ? 'Selesai' : 'Pending'}
                            </span>
                            <span className="text-xs text-gray-500">Terlambat {violation.daysOverdue} hari</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
