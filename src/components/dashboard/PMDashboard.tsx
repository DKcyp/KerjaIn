"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import PegawaiPerformanceChart from "./PegawaiPerformanceChart";
import TeamKPISection from "./TeamKPISection";

interface PMTask {
  id: number;
  kode: string;
  proyekNama: string;
  moduleNama: string;
  programmerName: string;
  status: string;
  taskComplexity: string;
  calculatedDueDate?: string;
  isLate?: boolean;
}

interface PMProject {
  id: number;
  name: string;
  totalTasks: number;
  completedTasks: number;
  pendingReview: number;
  progress: number;
  teamSize: number;
  status: "on-track" | "at-risk" | "delayed";
}

interface PMDashboardData {
  allTasks?: any[];
  todaysTasks: PMTask[];
  projects: PMProject[];

  taskStats: {
    totalTasks: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    overdue: number;
  };

}

interface PMDashboardProps {
  data: PMDashboardData;
  teamMembers?: Array<{ id: number; name: string }>;
}

export default function PMDashboard({ data, teamMembers = [] }: PMDashboardProps) {
  const today = new Date();
  const startMonth = new Date(today.getFullYear(), today.getMonth() - 1, 25);
  const startDate = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}-25`;
  const endDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-24`;
  const periodLabel = `${new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} - ${new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const filteredTaskStats = useMemo(() => {
    if (!data.allTasks) return data.taskStats;

    const filteredTasks = data.allTasks.filter((t: any) => {
      if (!t.scheduleAt) return false;
      const d = new Date(t.scheduleAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const taskDateStr = `${y}-${m}-${day}`;
      
      let isValid = true;
      if (startDate && taskDateStr < startDate) isValid = false;
      if (endDate && taskDateStr > endDate) isValid = false;
      return isValid;
    });

    return {
      totalTasks: filteredTasks.length,
      pending: filteredTasks.filter((t: any) => t.status === 'MENUNGGU_PROSES_USER').length,
      inProgress: filteredTasks.filter((t: any) => t.status === 'SEDANG_DIPROSES_USER' || t.status === 'SEDANG_DIPROSES_USER_PAUSED').length,
      pendingReview: filteredTasks.filter((t: any) => t.status === 'MENUNGGU_REVIEW_PM').length,
      approved: filteredTasks.filter((t: any) => t.status === 'SELESAI').length,
      overdue: filteredTasks.filter((t: any) => {
        const due = t.calculatedDueDate ? new Date(t.calculatedDueDate) : null;
        return due && due < new Date() && t.status !== 'SELESAI';
      }).length
    };
  }, [data.allTasks, data.taskStats, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard PM</h1>
      </div>
      {/* Statistics Cards Header */}
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Statistik Task</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">Periode: {periodLabel}</span>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Total Tasklist</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredTaskStats.totalTasks}</p>
            </div>
            <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-lg">
              <svg className="w-5 h-5 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Belum Dikerjakan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredTaskStats.pending}</p>
            </div>
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Sedang Dikerjakan</p>
              <p className="text-2xl font-bold text-blue-light-600 dark:text-blue-light-400">{filteredTaskStats.inProgress}</p>
            </div>
            <div className="p-2 bg-blue-light-50 dark:bg-blue-light-500/10 rounded-lg">
              <svg className="w-5 h-5 text-blue-light-500 dark:text-blue-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Menunggu Review PM</p>
              <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">{filteredTaskStats.pendingReview}</p>
            </div>
            <div className="p-2 bg-warning-50 dark:bg-warning-500/10 rounded-lg">
              <svg className="w-5 h-5 text-warning-500 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Selesai</p>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">{filteredTaskStats.approved}</p>
            </div>
            <div className="p-2 bg-success-50 dark:bg-success-500/10 rounded-lg">
              <svg className="w-5 h-5 text-success-500 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-theme-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Terlambat</p>
              <p className="text-2xl font-bold text-error-600 dark:text-error-400">{filteredTaskStats.overdue}</p>
            </div>
            <div className="p-2 bg-error-50 dark:bg-error-500/10 rounded-lg">
              <svg className="w-5 h-5 text-error-500 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: 60% Chart + 40% Proyek Saya */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[60%]">
          <PegawaiPerformanceChart tasks={data.allTasks || []} startDate={startDate} endDate={endDate} />
        </div>
        <div className="w-full lg:w-[40%] flex">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-theme-sm border border-gray-200 dark:border-gray-700 flex flex-col w-full max-h-[408px]">
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 rounded-t-lg flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-between w-full">
                Proyek Belum Selesai
                <span>({data.projects.length})</span>
              </h3>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto custom-scrollbar flex-1">
              {data.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/gantt-chart-project?projectId=${project.id}`}
                  className="block p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md hover:border-brand-500 dark:hover:border-brand-500 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-xs">{project.name}</h4>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{project.progress}%</span>
                  </div>
                  <div className="mb-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all ${
                          project.progress >= 75 ? 'bg-success-500' :
                          project.progress >= 50 ? 'bg-brand-500' :
                          project.progress >= 25 ? 'bg-warning-500' : 'bg-error-500'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{project.completedTasks}/{project.totalTasks} tugas</span>
                    <span className={`px-1 py-0.5 text-xs rounded-full font-medium ${
                      project.status === 'on-track' ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300' :
                      project.status === 'at-risk' ? 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300' :
                      'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300'
                    }`}>
                      {project.status === 'on-track' ? 'On Track' : project.status === 'at-risk' ? 'Berisiko' : 'Terlambat'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      {teamMembers.length > 0 && (
        <TeamKPISection 
          startDate={startDate}
          endDate={endDate}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
}
