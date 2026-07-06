import type { Metadata } from "next";
import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import TaskStatusMonthly, { type SeriesItem } from "@/components/charts/bar/TaskStatusMonthly";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard overview",
};

// Ensure dashboard is per-request and never cached, so session/user switch reflects immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type TaskStatus = "MENUNGGU_PROSES_USER" | "SEDANG_DIPROSES_USER" | "MENUNGGU_REVIEW_PM" | "SELESAI";

export default async function DashboardPage() {
  // Scope by role (PM only sees their projects); others see all
  const token = (await cookies()).get("session")?.value;
  const session = verifySession(token || null);

  // Determine project scope for PM
  let scopedProjectIds: number[] | null = null;
  if (session?.role === "PM") {
    const teams = await prisma.proyekTeam.findMany({
      where: { pegawaiId: session.id },
      select: { projectId: true },
    });
    scopedProjectIds = Array.from(new Set(teams.map((t: { projectId: number }) => t.projectId)));
    if (scopedProjectIds.length === 0) scopedProjectIds = []; // no access
  }

  const whereProjectScope = scopedProjectIds ? { id: { in: scopedProjectIds } } : {};
  const whereTaskScope = scopedProjectIds ? { projectId: { in: scopedProjectIds } } : {};

  // Parallel queries
  const [totalPegawai, totalProyek, taskStatusAgg] = await Promise.all([
    prisma.pegawai.count(),
    prisma.proyek.count({ where: whereProjectScope }),
    prisma.tasklist.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: whereTaskScope as any,
    }),
  ]);

  // Build 12-month window (oldest -> newest)
  const now = new Date();
  const startWindow = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
  const endWindow = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch tasks in window (createdAt used as "aktivitas")
  const tasksLastYear = await prisma.tasklist.findMany({
    where: {
      ...(whereTaskScope as any),
      createdAt: { gte: startWindow, lte: endWindow },
    },
    select: { id: true, status: true, createdAt: true },
  });

  // Prepare month categories and index mapping
  const monthLabels: string[] = [];
  const monthKeys: string[] = [];
  const monthIndex = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(startWindow.getFullYear(), startWindow.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // e.g., 2025-08
    const label = d.toLocaleString(undefined, { month: "short" });
    monthLabels.push(label);
    monthKeys.push(key);
    monthIndex.set(key, i);
  }

  // Initialize counters per status
  const statuses: TaskStatus[] = [
    "MENUNGGU_PROSES_USER",
    "SEDANG_DIPROSES_USER",
    "MENUNGGU_REVIEW_PM",
    "SELESAI",
  ];
  const counts: Record<TaskStatus, number[]> = {
    MENUNGGU_PROSES_USER: Array(12).fill(0),
    SEDANG_DIPROSES_USER: Array(12).fill(0),
    MENUNGGU_REVIEW_PM: Array(12).fill(0),
    SELESAI: Array(12).fill(0),
  };

  for (const t of tasksLastYear) {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(key);
    if (idx != null) {
      counts[t.status as TaskStatus][idx]++;
    }
  }

  const statusLabel = (s: TaskStatus) =>
    s === "MENUNGGU_PROSES_USER"
      ? "Menunggu Proses"
      : s === "SEDANG_DIPROSES_USER"
      ? "Sedang Diproses"
      : s === "MENUNGGU_REVIEW_PM"
      ? "Menunggu Review PM"
      : "Selesai";
  const series: SeriesItem[] = statuses.map((s) => ({ name: statusLabel(s), data: counts[s] }));

  // No recent/upcoming tables; only KPI + monthly chart

  const byStatus = new Map<TaskStatus, number>();
  for (const g of taskStatusAgg) {
    byStatus.set(g.status as TaskStatus, Number(g._count._all || 0));
  }

  const card = (label: string, value: number | string) => (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/30 p-4">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {card("Total Proyek", totalProyek)}
        {card("Total Pegawai", totalPegawai)}
        {card("Task Menunggu", (byStatus.get("MENUNGGU_PROSES_USER") || 0) as number)}
        {card("Task Diproses", (byStatus.get("SEDANG_DIPROSES_USER") || 0) as number)}
      </div>

      {/* Hanya menampilkan grafik bulanan */}

      {/* Monthly per-status chart */}
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-gray-900/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Grafik Tasklist per Status (12 Bulan)</h3>
        </div>
        <div className="mt-4">
          <TaskStatusMonthly categories={monthLabels} series={series} />
        </div>
      </div>
    </div>
  );
}
