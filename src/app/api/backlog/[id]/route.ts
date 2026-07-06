import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();
const db: any = prisma;

// GET /api/backlog/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: idParam } = await params;
    const id = Number(idParam);
    const item = await db.backlog.findFirst({ where: { id, isDeleted: false } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('GET /api/backlog/[id] error', e);
    return NextResponse.json({ error: 'Failed to fetch backlog item' }, { status: 500 });
  }
}

// PUT /api/backlog/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();
    const { title, note, projectId, moduleId, assignedTo, tasklistId, estimatedManHour } = body || {};

    const item = await db.backlog.update({
      where: { id },
      data: {
        title: title != null ? String(title).trim() : undefined,
        note: note != null ? String(note).trim() : undefined,
        projectId: projectId === undefined ? undefined : (projectId ? Number(projectId) : null),
        moduleId: moduleId === undefined ? undefined : (moduleId ? Number(moduleId) : null),
        assignedTo: assignedTo === undefined ? undefined : (assignedTo ? Number(assignedTo) : null),
        tasklistId: tasklistId === undefined ? undefined : (tasklistId ? Number(tasklistId) : null),
        estimatedManHour: estimatedManHour === undefined ? undefined : (estimatedManHour ? parseFloat(estimatedManHour) : null),
      }
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('PUT /api/backlog/[id] error', e);
    return NextResponse.json({ error: 'Failed to update backlog item' }, { status: 500 });
  }
}

// DELETE /api/backlog/[id] (soft delete)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: idParam } = await params;
    const id = Number(idParam);
    const item = await db.backlog.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('DELETE /api/backlog/[id] error', e);
    return NextResponse.json({ error: 'Failed to delete backlog item' }, { status: 500 });
  }
}
