import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/proyek-modules/[projectId]/migrate
// Migrates legacy proyek_modules.modulesJson to relational proyek_module for a specific project
export async function POST(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const { projectId: p } = await ctx.params;
  const projectId = Number(p);
  if (!Number.isFinite(projectId)) return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });

  // Legacy storage proyek_modules has been removed. Inform clients to use relational API.
  return NextResponse.json({
    error: 'Legacy table proyek_modules tidak tersedia. Tidak perlu migrasi. Gunakan struktur baru di /api/proyek-modules/[projectId]/tree.',
  }, { status: 409 });
}
