import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { Prisma, TaskStatus } from '@prisma/client';

export const runtime = 'nodejs';

// GET /api/gantt-chart
export async function GET(req: NextRequest) {
  try {
    // Parse session
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectIdParam = searchParams.get('projectId');
    const pegawaiIdParam = searchParams.get('pegawaiId');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Build where clause
    const where: Prisma.TasklistWhereInput = {
      depId: (session as any).departemenId ?? null
    };

    // Role-based filtering
    if (session.role === 'PROGRAMMER') {
      // Programmer only sees their own tasks
      where.pegawaiId = session.id;
    } else if (session.role === 'ADMIN') {
      // Admin sees all tasks (no filter)
    } else if (session.role === 'PM') {
      // PM sees tasks from their projects
      const teams = await prisma.proyekTeam.findMany({
        where: { pegawaiId: session.id },
        select: { projectId: true },
      });
      const projectIds = teams.map(t => t.projectId);
      if (projectIds.length === 0) {
        return NextResponse.json({ items: [], grouped: [], total: 0 });
      }
      // If specific project is selected, use that; otherwise use all PM's projects
      if (projectIdParam) {
        const pid = Number(projectIdParam);
        if (Number.isFinite(pid)) {
          where.projectId = pid;
        }
      } else {
        where.projectId = { in: projectIds };
      }
    }
    // SUPER_ADMIN sees all tasks

    // Apply project filter (for non-PM roles or when PM selects specific project)
    if (projectIdParam && session.role !== 'PM') {
      const pid = Number(projectIdParam);
      if (Number.isFinite(pid)) {
        where.projectId = pid;
      }
    }

    // Apply pegawai filter (only for roles with higher access)
    if (pegawaiIdParam && session.role !== 'PROGRAMMER') {
      const eid = Number(pegawaiIdParam);
      if (Number.isFinite(eid)) {
        where.pegawaiId = eid;
      }
    }

    // Date range filter - include tasks that overlap with the range
    const makeDateAt = (dateStr: string, endOfDay = false): Date | null => {
      const s = String(dateStr || '').trim();
      if (!s.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
      try {
        const [y, m, d] = s.split('-').map(v => Number(v));
        const dt = new Date(y, (m || 1) - 1, d || 1, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
        return dt;
      } catch {
        return null;
      }
    };

    const fromDate = fromParam ? makeDateAt(fromParam, false) : null;
    const toDate = toParam ? makeDateAt(toParam, true) : null;

    if (fromDate && toDate) {
      // Include tasks that overlap with the date range:
      // 1. Task starts within range
      // 2. Task ends within range  
      // 3. Task spans the entire range
      where.OR = [
        // Task starts within range
        {
          scheduleAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
        // Task ends within range (calculatedDueDate)
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
    } else if (fromDate) {
      where.OR = [
        { scheduleAt: { gte: fromDate } },
        { calculatedDueDate: { gte: fromDate } },
      ];
    } else if (toDate) {
      where.OR = [
        { scheduleAt: { lte: toDate } },
        { calculatedDueDate: { lte: toDate } },
      ];
    }

    // Get all valid moduleIds to filter out orphaned tasks
    const validModuleIds = await prisma.proyekModule.findMany({
      select: { id: true }
    });
    const validModuleIdSet = new Set(validModuleIds.map(m => m.id));

    // Add filter to exclude tasks with invalid moduleIds (orphaned records)
    // This prevents "Field module is required to return data, got `null` instead" errors
    where.moduleId = { in: Array.from(validModuleIdSet) };

    // Fetch tasks
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
        updatedAt: true, // Use updatedAt as proxy for completion time
        module: {
          select: {
            nama: true,
            kode: true,
          },
        },
      },
      orderBy: [
        { pegawaiId: 'asc' },
        { scheduleAt: 'asc' },
      ],
    });

    // For completed tasks, get the actual completion date from logs (when PM approved)
    const completedTaskIds = tasks.filter(t => t.status === 'SELESAI').map(t => t.id);
    const completionLogs = completedTaskIds.length > 0
      ? await prisma.$queryRaw<Array<{ taskId: number; completedAt: Date }>>`
          SELECT DISTINCT ON ("taskId") "taskId", waktu as "completedAt"
          FROM tasklist_log
          WHERE "taskId" = ANY(${completedTaskIds})
            AND (status = 'SELESAI' OR action = 'APPROVE' OR keterangan LIKE '%approve%' OR keterangan LIKE '%di-approve%')
          ORDER BY "taskId", waktu DESC
        `
      : [];
    const completionMap = new Map(completionLogs.map(l => [l.taskId, l.completedAt]));
    
    // Get submitted for review date - find log with "dikirim untuk review" in keterangan
    const allTaskIds = tasks.map(t => t.id);
    const submittedLogs = allTaskIds.length > 0
      ? await prisma.tasklistLog.findMany({
          where: {
            taskId: { in: allTaskIds },
            keterangan: { contains: 'dikirim untuk review', mode: 'insensitive' }
          },
          select: {
            taskId: true,
            waktu: true
          },
          orderBy: {
            waktu: 'asc'
          }
        })
      : [];
    
    // Group by taskId and take first (earliest) waktu
    const submittedMap = new Map<number, Date>();
    submittedLogs.forEach(log => {
      if (!submittedMap.has(log.taskId)) {
        submittedMap.set(log.taskId, log.waktu);
      }
    });

    // Get pegawai names
    const pegawaiIds = [...new Set(tasks.map(t => t.pegawaiId))];
    const pegawaiList = pegawaiIds.length > 0 
      ? await prisma.pegawai.findMany({
          where: { id: { in: pegawaiIds } },
          select: { id: true, namaLengkap: true },
        })
      : [];
    const pegawaiMap = new Map(pegawaiList.map(p => [p.id, p.namaLengkap]));

    // Get project names
    const projectIds = [...new Set(tasks.map(t => t.projectId))];
    const projectList = projectIds.length > 0
      ? await prisma.proyek.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, namaProyek: true },
        })
      : [];
    const projectMap = new Map(projectList.map(p => [p.id, p.namaProyek]));

    // Transform tasks
    const items = tasks.map(t => {
      // Get submitted for review date
      const submittedForReviewAt = submittedMap.get(t.id);
      
      // Get actual completion/approved date from logs, fallback to updatedAt
      const approvedAt = t.status === 'SELESAI' 
        ? (completionMap.get(t.id) || t.updatedAt)
        : null;
      
      return {
        id: t.id,
        projectId: t.projectId,
        moduleId: t.moduleId,
        pegawaiId: t.pegawaiId,
        pegawaiNama: pegawaiMap.get(t.pegawaiId) || 'Unknown',
        proyekNama: projectMap.get(t.projectId) || 'Unknown',
        moduleNama: t.module?.nama || 'Unknown',
        moduleKode: t.module?.kode || '',
        keterangan: t.keterangan,
        kode: t.kode,
        scheduleAt: t.scheduleAt.toISOString(),
        calculatedDueDate: t.calculatedDueDate?.toISOString() || null,
        submittedForReviewAt: submittedForReviewAt?.toISOString() || null,
        approvedAt: approvedAt?.toISOString() || null,
        status: t.status,
        taskComplexity: t.taskComplexity,
        tasklistType: t.tasklistType,
        startedAt: t.startedAt?.toISOString() || null,
        totalDurationMinutes: t.totalDurationMinutes,
      };
    });

    // Group by pegawai
    const grouped: Array<{
      pegawaiId: number;
      pegawaiNama: string;
      tasks: typeof items;
    }> = [];

    const groupedMap = new Map<number, typeof items>();
    
    items.forEach(item => {
      if (!groupedMap.has(item.pegawaiId)) {
        groupedMap.set(item.pegawaiId, []);
      }
      groupedMap.get(item.pegawaiId)!.push(item);
    });

    groupedMap.forEach((tasks, pegawaiId) => {
      grouped.push({
        pegawaiId,
        pegawaiNama: pegawaiMap.get(pegawaiId) || 'Unknown',
        tasks,
      });
    });

    // Sort grouped by pegawai name
    grouped.sort((a, b) => a.pegawaiNama.localeCompare(b.pegawaiNama));

    return NextResponse.json({
      items,
      grouped,
      total: items.length,
    });
  } catch (e) {
    console.error('GET /api/gantt-chart error:', e);
    return NextResponse.json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? (e instanceof Error ? e.message : String(e)) : undefined
    }, { status: 500 });
  }
}
