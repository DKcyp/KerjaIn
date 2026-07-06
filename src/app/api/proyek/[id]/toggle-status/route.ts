import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession, hasPermission } from '@/lib/auth';

// PATCH /api/proyek/[id]/toggle-status
export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication and permissions
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await hasPermission(session.user.id, 'project.update'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    // Get current project
    const project = await prisma.proyek.findUnique({ 
      where: { id },
      select: { id: true, kodeProyek: true, namaProyek: true, isActive: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Toggle isActive status
    const updated = await prisma.proyek.update({
      where: { id },
      data: { 
        isActive: !project.isActive
      },
      select: {
        id: true,
        kodeProyek: true,
        namaProyek: true,
        isActive: true
      }
    });

    return NextResponse.json({ 
      success: true,
      message: `Project ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      item: updated // Frontend expects 'item' not 'project'
    });
  } catch (e) {
    console.error('PATCH /api/proyek/[id]/toggle-status error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}