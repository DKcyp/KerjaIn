import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/gantt-chart-project
export async function GET(req: NextRequest) {
  try {
    // Parse session
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const where: any = {
      projectId: parseInt(projectId),
      depId: (session as any).departemenId ?? null,
    };

    if (from && to) {
      where.OR = [
        { scheduleAt: { gte: new Date(from), lte: new Date(to) } },
        { calculatedDueDate: { gte: new Date(from), lte: new Date(to) } },
        {
          AND: [
            { scheduleAt: { lte: new Date(to) } },
            { calculatedDueDate: { gte: new Date(from) } }
          ]
        }
      ];
    }

    const tasks = await (prisma as any).tasklist.findMany({
      where,
      select: {
        id: true,
        projectId: true,
        moduleId: true,
        pegawaiId: true,
        scheduleAt: true,
        status: true,
        keterangan: true,
        calculatedDueDate: true,
        startedAt: true,
        updatedAt: true,
        taskComplexity: true,
        tasklistType: true,
        kode: true,
        imagePath: true,
        version: true,
        baVersion: true,
        module: {
          select: {
            id: true,
            nama: true,
            version: true,
            baVersion: true,
          }
        },
      },
      orderBy: [
        { moduleId: 'asc' },
        { scheduleAt: 'asc' }
      ]
    });

    // Get pegawai names
    const pegawaiIds = [...new Set(tasks.map((t: any) => t.pegawaiId))];
    const pegawais = await (prisma as any).pegawai.findMany({
      where: { id: { in: pegawaiIds } },
      select: { id: true, namaLengkap: true }
    });
    const pegawaiMap = new Map(pegawais.map((p: any) => [p.id, p.namaLengkap]));

    // Get proyek names
    const proyekIds = [...new Set(tasks.map((t: any) => t.projectId))];
    const proyeks = await (prisma as any).proyek.findMany({
      where: { id: { in: proyekIds } },
      select: { id: true, namaProyek: true }
    });
    const proyekMap = new Map(proyeks.map((p: any) => [p.id, p.namaProyek]));

    // Get task logs for submitted and approved dates
    const taskIds = tasks.map((t: any) => t.id);
    const logs = await (prisma as any).tasklistLog.findMany({
      where: {
        taskId: { in: taskIds },
        OR: [
          { action: 'STATUS_CHANGE', status: 'MENUNGGU_REVIEW_PM' },
          { action: 'STATUS_CHANGE', status: 'SELESAI' }
        ]
      },
      select: {
        taskId: true,
        waktu: true,
        action: true,
        status: true,
      },
      orderBy: { waktu: 'asc' }
    });

    // Map logs to tasks
    const logsByTask: Record<number, any> = {};
    logs.forEach((log: any) => {
      if (!logsByTask[log.taskId]) {
        logsByTask[log.taskId] = {};
      }
      if (log.status === 'MENUNGGU_REVIEW_PM') {
        logsByTask[log.taskId].submittedForReviewAt = log.waktu;
      } else if (log.status === 'SELESAI') {
        logsByTask[log.taskId].approvedAt = log.waktu;
      }
    });

    const items = tasks.map((task: any) => {
      // Use log date if available, otherwise use updatedAt for completed tasks as fallback
      const approvedAt = logsByTask[task.id]?.approvedAt || 
        (task.status === 'SELESAI' ? task.updatedAt : null);
      
      const item = {
        id: task.id,
        projectId: task.projectId,
        moduleId: task.moduleId,
        moduleNama: task.module?.nama || 'Unknown Module',
        moduleVersion: task.version || task.module?.version || null,
        baVersion: task.baVersion || task.module?.baVersion || null,
        pegawaiId: task.pegawaiId,
        pegawaiNama: pegawaiMap.get(task.pegawaiId) || 'Unknown User',
        proyekNama: proyekMap.get(task.projectId) || 'Unknown Project',
        scheduleAt: task.scheduleAt?.toISOString() || new Date().toISOString(),
        status: task.status,
        keterangan: task.keterangan,
        calculatedDueDate: task.calculatedDueDate?.toISOString() || null,
        startedAt: task.startedAt?.toISOString() || null,
        submittedForReviewAt: logsByTask[task.id]?.submittedForReviewAt?.toISOString() || null,
        approvedAt: approvedAt?.toISOString() || null,
        taskComplexity: task.taskComplexity,
        tasklistType: task.tasklistType,
        kode: task.kode,
        imagePath: task.imagePath,
      };
      
      // Debug log for first item
      if (task.id === tasks[0].id) {
        console.log('First task item:', {
          moduleId: item.moduleId,
          moduleName: item.moduleNama,
          taskVersion: item.moduleVersion,
          taskBaVersion: item.baVersion,
          rawModuleVersion: task.module?.version
        });
      }
      
      return item;
    });

    console.log('Sample task data:', tasks.length > 0 ? {
      id: tasks[0].id,
      moduleId: tasks[0].moduleId,
      moduleName: tasks[0].module?.nama,
      taskVersion: tasks[0].version,
      taskBaVersion: tasks[0].baVersion
    } : 'No tasks');

    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET /api/gantt-chart-project error:', e);
    return NextResponse.json({
      error: 'Server error',
      details: e instanceof Error ? e.message : String(e)
    }, { status: 500 });
  }
}
