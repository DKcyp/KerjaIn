import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * External API endpoint for managing a single tasklist item
 *
 * GET    /api/external/tasklist/[id] - Get single task by ID with availableActions
 * DELETE /api/external/tasklist/[id] - Delete task by ID
 *
 * Authentication: X-API-Key header (EXTERNAL_API_KEY)
 *
 * GET Query Parameters:
 * - asUserId (optional): Act as this user (pegawai ID) for availableActions calculation.
 *                        If omitted, availableActions is calculated for PM/SUPER_ADMIN context.
 */

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.EXTERNAL_API_KEY;
  if (!validApiKey) {
    console.error('EXTERNAL_API_KEY not configured in environment');
    return false;
  }
  return apiKey === validApiKey;
}

function sanitizeTasklistData(item: any) {
  return {
    ...item,
    createdBy: item.createdBy ?? null,
    taskComplexity: item.taskComplexity ?? 'MEDIUM',
    isPaused: item.isPaused ?? false,
    totalDurationMinutes: item.totalDurationMinutes ?? 0,
    tasklistType: item.tasklistType ?? 'DEVELOPMENT',
    status: item.status ?? 'MENUNGGU_PROSES_USER',
  };
}

// GET /api/external/tasklist/[id]
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const asUserId = searchParams.get('asUserId');

    let session: { id: number; role: string } | null = null;
    if (asUserId) {
      const uid = Number(asUserId);
      if (Number.isFinite(uid)) {
        const user = await prisma.pegawai.findUnique({ where: { id: uid }, select: { id: true, role: true } });
        if (user) session = { id: user.id, role: user.role };
      }
    }

    const task = await prisma.tasklist.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const [proyek, modul, pegawai, creator] = await Promise.all([
      prisma.proyek.findUnique({ where: { id: task.projectId } }),
      prisma.proyekModule.findUnique({ where: { id: task.moduleId } }),
      task.pegawaiId ? prisma.pegawai.findUnique({ where: { id: task.pegawaiId } }) : null,
      task.createdBy ? prisma.pegawai.findUnique({ where: { id: task.createdBy } }) : null,
    ]);

    // Calculate availableActions (mirrors internal GET /api/tasklist/[id])
    let availableActions: string[] = [];

    if (session) {
      const isAssignee = task.pegawaiId === session.id;
      const isCreator = task.createdBy === session.id;

      let isPM = session.role === 'PM' || session.role === 'SUPER_ADMIN';
      if (!isPM) {
        const userTeam = await prisma.proyekTeam.findFirst({
          where: { projectId: task.projectId, pegawaiId: session.id },
        });
        if (userTeam && userTeam.jabatan && userTeam.jabatan.toUpperCase().includes('PM')) {
          isPM = true;
        }
      }

      const status = task.status;

      // Assignee actions
      if (isAssignee) {
        if (status === 'MENUNGGU_PROSES_USER') availableActions.push('start');
        else if (status === 'SEDANG_DIPROSES_USER') availableActions.push('pause', 'complete');
        else if (status === 'SEDANG_DIPROSES_USER_PAUSED') availableActions.push('resume', 'complete');
      }

      // PM actions
      if (isPM && status === 'MENUNGGU_REVIEW_PM') {
        let creatorIsPMorPIC = false;
        if (task.createdBy && !isCreator) {
          const creatorTeam = await prisma.proyekTeam.findFirst({
            where: { projectId: task.projectId, pegawaiId: task.createdBy },
          });
          creatorIsPMorPIC = !!(
            creatorTeam &&
            (creatorTeam.teamSource === 'inherited' ||
              (creatorTeam.jabatan &&
                (creatorTeam.jabatan.toUpperCase().includes('PM') ||
                  creatorTeam.jabatan.toUpperCase().includes('PIC'))))
          );
        }
        if (isCreator || !creatorIsPMorPIC) {
          availableActions.push('approve', 'reject');
        }
      }

      // Edit and delete
      if (isAssignee || isPM || session.role === 'SUPER_ADMIN') availableActions.push('edit');
      if (isPM || session.role === 'SUPER_ADMIN') availableActions.push('delete');

      // Return to backlog
      if (isCreator && task.sourceBacklogId) availableActions.push('return-to-backlog');
    }

    // Enriched item matching internal format
    const safeItem = {
      ...sanitizeTasklistData(task),
      proyekNama: proyek?.namaProyek || null,
      moduleNama: modul?.nama || null,
      pegawaiNama: pegawai?.namaLengkap || null,
      pegawaiRole: pegawai?.role || null,
      creatorNama: creator?.namaLengkap || null,
      availableActions,
    };

    return NextResponse.json({ success: true, data: { item: safeItem } });
  } catch (error) {
    console.error('Error fetching task via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task', details: (error as Error)?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/external/tasklist/[id]
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: 'Invalid task ID' }, { status: 400 });
    }

    const task = await prisma.tasklist.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    await prisma.tasklist.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
      data: { id, kode: task.kode },
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
    console.error('Error deleting task via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
