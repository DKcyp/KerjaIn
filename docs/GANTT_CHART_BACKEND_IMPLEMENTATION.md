# Gantt Chart - Backend Implementation Guide

## Overview

Dokumen ini menjelaskan implementasi backend untuk fitur Gantt Chart - Task Management. Fitur ini memvisualisasikan timeline task dalam bentuk Gantt Chart dengan kemampuan filter berdasarkan proyek, pegawai, dan rentang tanggal.

## Current Implementation Status

### Frontend (Completed)
- ✅ Page component: `src/app/(admin)/gantt-chart/page.tsx`
- ✅ Layout: `src/app/(admin)/gantt-chart/layout.tsx`
- ✅ Menu integration: Added to `src/layout/AppSidebar.tsx`
- ✅ Date range picker dengan default 15 hari dari hari ini
- ✅ Filter proyek (Select2)
- ✅ Filter pegawai (Select2)
- ✅ Visualisasi Gantt Chart dengan color coding berdasarkan status
- ✅ Legend untuk status task

### Backend (Implemented)
- ✅ `GET /api/gantt-chart` - Dedicated endpoint for Gantt Chart data
- ✅ `GET /api/proyek` - Mengambil daftar proyek
- ✅ `GET /api/pegawai-basic` - Mengambil daftar pegawai

The dedicated Gantt Chart API (`src/app/api/gantt-chart/route.ts`) provides:
- Optimized date range filtering (includes tasks that overlap with the range)
- Role-based access control (PROGRAMMER sees own tasks, PM sees project tasks, etc.)
- Pre-grouped data by pegawai for efficient frontend rendering
- All task details needed for visualization

## Recommended Backend Enhancements

### 1. Dedicated Gantt Chart API Endpoint

Buat endpoint khusus untuk Gantt Chart yang lebih optimal:

```typescript
// src/app/api/gantt-chart/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  // Verify session
  const token = (await cookies()).get("session")?.value;
  const session = verifySession(token || null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const pegawaiId = searchParams.get("pegawaiId");
  const from = searchParams.get("from"); // ISO date string
  const to = searchParams.get("to"); // ISO date string

  // Build where clause
  const where: any = {};
  
  if (projectId) {
    where.projectId = parseInt(projectId);
  }
  
  if (pegawaiId) {
    where.pegawaiId = parseInt(pegawaiId);
  }

  // Date range filter - include tasks that overlap with the range
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    where.OR = [
      // Task starts within range
      {
        scheduleAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      // Task ends within range
      {
        calculatedDueDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      // Task spans the entire range
      {
        AND: [
          { scheduleAt: { lte: fromDate } },
          { calculatedDueDate: { gte: toDate } },
        ],
      },
    ];
  }

  // Role-based filtering
  if (session.role === "PROGRAMMER" || session.role === "ADMIN") {
    where.pegawaiId = session.id;
  } else if (session.role === "PM") {
    // PM can only see tasks from their projects
    const teams = await prisma.proyekTeam.findMany({
      where: { pegawaiId: session.id },
      select: { projectId: true },
    });
    const projectIds = teams.map((t) => t.projectId);
    if (projectIds.length > 0) {
      where.projectId = { in: projectIds };
    } else {
      // PM has no projects, return empty
      return NextResponse.json({ items: [], grouped: {} });
    }
  }

  // Fetch tasks with related data
  const tasks = await prisma.tasklist.findMany({
    where,
    select: {
      id: true,
      projectId: true,
      moduleId: true,
      pegawaiId: true,
      scheduleAt: true,
      calculatedDueDate: true,
      status: true,
      keterangan: true,
      kode: true,
      taskComplexity: true,
      tasklistType: true,
      startedAt: true,
      totalDurationMinutes: true,
      module: {
        select: {
          nama: true,
          kode: true,
        },
      },
    },
    orderBy: [
      { pegawaiId: "asc" },
      { scheduleAt: "asc" },
    ],
  });

  // Get pegawai names
  const pegawaiIds = [...new Set(tasks.map((t) => t.pegawaiId))];
  const pegawaiList = await prisma.pegawai.findMany({
    where: { id: { in: pegawaiIds } },
    select: { id: true, namaLengkap: true },
  });
  const pegawaiMap = new Map(pegawaiList.map((p) => [p.id, p.namaLengkap]));

  // Get project names
  const projectIds = [...new Set(tasks.map((t) => t.projectId))];
  const projectList = await prisma.proyek.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, namaProyek: true },
  });
  const projectMap = new Map(projectList.map((p) => [p.id, p.namaProyek]));

  // Transform and group by pegawai
  const items = tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    moduleId: t.moduleId,
    pegawaiId: t.pegawaiId,
    pegawaiNama: pegawaiMap.get(t.pegawaiId) || "Unknown",
    proyekNama: projectMap.get(t.projectId) || "Unknown",
    moduleNama: t.module?.nama || "Unknown",
    moduleKode: t.module?.kode || "",
    keterangan: t.keterangan,
    kode: t.kode,
    scheduleAt: t.scheduleAt.toISOString(),
    calculatedDueDate: t.calculatedDueDate?.toISOString() || null,
    status: t.status,
    taskComplexity: t.taskComplexity,
    tasklistType: t.tasklistType,
    startedAt: t.startedAt?.toISOString() || null,
    totalDurationMinutes: t.totalDurationMinutes,
  }));

  // Group by pegawai for easier frontend rendering
  const grouped: Record<number, {
    pegawaiId: number;
    pegawaiNama: string;
    tasks: typeof items;
  }> = {};

  items.forEach((item) => {
    if (!grouped[item.pegawaiId]) {
      grouped[item.pegawaiId] = {
        pegawaiId: item.pegawaiId,
        pegawaiNama: item.pegawaiNama,
        tasks: [],
      };
    }
    grouped[item.pegawaiId].tasks.push(item);
  });

  return NextResponse.json({
    items,
    grouped: Object.values(grouped),
    total: items.length,
  });
}
```

### 2. Task Progress Calculation

Tambahkan endpoint untuk menghitung progress task secara real-time:

```typescript
// src/app/api/gantt-chart/progress/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  const task = await prisma.tasklist.findUnique({
    where: { id: parseInt(taskId) },
    select: {
      id: true,
      status: true,
      scheduleAt: true,
      calculatedDueDate: true,
      startedAt: true,
      totalDurationMinutes: true,
      taskComplexity: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Calculate progress based on status and time
  let progress = 0;
  let isOverdue = false;
  let estimatedCompletion: Date | null = null;

  switch (task.status) {
    case "SELESAI":
      progress = 100;
      break;
    case "MENUNGGU_REVIEW_PM":
      progress = 90;
      break;
    case "SEDANG_DIPROSES_USER":
    case "SEDANG_DIPROSES_USER_PAUSED":
      // Calculate based on time spent vs estimated time
      if (task.calculatedDueDate && task.startedAt) {
        const totalEstimatedMinutes = 
          (new Date(task.calculatedDueDate).getTime() - new Date(task.scheduleAt).getTime()) / 60000;
        progress = Math.min(80, Math.round((task.totalDurationMinutes / totalEstimatedMinutes) * 100));
      } else {
        progress = 50;
      }
      break;
    default:
      progress = 0;
  }

  // Check if overdue
  if (task.calculatedDueDate && task.status !== "SELESAI") {
    isOverdue = new Date() > new Date(task.calculatedDueDate);
  }

  return NextResponse.json({
    taskId: task.id,
    progress,
    isOverdue,
    status: task.status,
    estimatedCompletion,
  });
}
```

### 3. Gantt Chart Statistics API

Endpoint untuk statistik yang ditampilkan di Gantt Chart:

```typescript
// src/app/api/gantt-chart/stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const token = (await cookies()).get("session")?.value;
  const session = verifySession(token || null);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {};
  
  if (projectId) {
    where.projectId = parseInt(projectId);
  }

  if (from && to) {
    where.scheduleAt = {
      gte: new Date(from),
      lte: new Date(to),
    };
  }

  // Get task counts by status
  const statusCounts = await prisma.tasklist.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  // Get overdue tasks count
  const overdueCount = await prisma.tasklist.count({
    where: {
      ...where,
      status: { notIn: ["SELESAI"] },
      calculatedDueDate: { lt: new Date() },
    },
  });

  // Get tasks by pegawai
  const tasksByPegawai = await prisma.tasklist.groupBy({
    by: ["pegawaiId"],
    where,
    _count: { _all: true },
  });

  return NextResponse.json({
    statusCounts: statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>),
    overdueCount,
    tasksByPegawai,
    totalTasks: statusCounts.reduce((sum, item) => sum + item._count._all, 0),
  });
}
```

## Database Considerations

### Indexes

Pastikan index berikut sudah ada untuk performa optimal:

```sql
-- Already exists in schema
CREATE INDEX idx_tasklist_project_id ON tasklist(project_id);
CREATE INDEX idx_tasklist_pegawai_id ON tasklist(pegawai_id);
CREATE INDEX idx_tasklist_schedule_at ON tasklist(schedule_at);
CREATE INDEX idx_tasklist_calculated_due_date ON tasklist(calculated_due_date);

-- Recommended additional composite index for Gantt Chart queries
CREATE INDEX idx_tasklist_gantt ON tasklist(pegawai_id, schedule_at, calculated_due_date);
```

### Query Optimization

Untuk dataset besar, pertimbangkan:

1. **Pagination**: Limit jumlah pegawai yang ditampilkan per halaman
2. **Caching**: Cache hasil query untuk rentang tanggal yang sama
3. **Lazy Loading**: Load task details on hover/click

## Frontend Integration

### Update Frontend to Use Dedicated API

```typescript
// Di src/app/(admin)/gantt-chart/page.tsx

// Ganti fetch ke /api/tasklist dengan:
const res = await fetch(`/api/gantt-chart?${params.toString()}`, { 
  credentials: 'include',
  cache: 'no-store'
});

if (res.ok) {
  const data = await res.json();
  // data.grouped sudah terstruktur per pegawai
  setTasksByPegawai(data.grouped);
}
```

## Security Considerations

1. **Role-based Access**: API harus memfilter data berdasarkan role user
2. **Project Scope**: PM hanya bisa melihat task dari proyek mereka
3. **Rate Limiting**: Implementasi rate limiting untuk mencegah abuse
4. **Input Validation**: Validasi semua parameter input

## Future Enhancements

1. **Drag & Drop**: Kemampuan untuk mengubah schedule task via drag & drop
2. **Dependencies**: Visualisasi dependency antar task
3. **Milestones**: Penambahan milestone markers
4. **Export**: Export Gantt Chart ke PDF/PNG
5. **Real-time Updates**: WebSocket untuk update real-time saat task berubah
6. **Zoom Levels**: Day/Week/Month view options
7. **Critical Path**: Highlight critical path dalam project

## Testing

### Unit Tests

```typescript
// __tests__/api/gantt-chart.test.ts

describe('Gantt Chart API', () => {
  it('should return tasks within date range', async () => {
    // Test implementation
  });

  it('should filter by project', async () => {
    // Test implementation
  });

  it('should filter by pegawai', async () => {
    // Test implementation
  });

  it('should respect role-based access', async () => {
    // Test implementation
  });
});
```

## Deployment Checklist

- [ ] Create API endpoint `/api/gantt-chart`
- [ ] Add database indexes if needed
- [ ] Test with production-like data volume
- [ ] Verify role-based access control
- [ ] Performance testing with large datasets
- [ ] Update API documentation
