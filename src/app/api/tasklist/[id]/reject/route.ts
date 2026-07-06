import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromRequest } from '@/lib/auth';
import { validateProgrammerActionTime, createWorkingHoursErrorResponse } from '@/lib/taskValidation';

// PUT /api/tasklist/[id]/reject
// Mobile kirim: X-API-Key: pm-key-2024 (atau 172dc4710ab54af8b1b405c89d6de9f0)
// Body: { keterangan: string }  ← wajib
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const session = parseSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Hanya PM, ADMIN, SUPER_ADMIN yang bisa reject
  if (!['PM', 'ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ✅ Validasi jam kerja - PM/ADMIN tidak boleh reject di luar jam kerja
  const workingHoursValidation = await validateProgrammerActionTime(session.id.toString(), 'reject');
  if (!workingHoursValidation.isAllowed) {
    console.log(`⏰ [Working Hours] Task reject blocked - outside working hours`);
    console.log(`   Current time: ${workingHoursValidation.workingHours?.current}`);
    console.log(`   Working hours: ${workingHoursValidation.workingHours?.start} - ${workingHoursValidation.workingHours?.end}`);
    
    return NextResponse.json(
      createWorkingHoursErrorResponse(workingHoursValidation),
      { status: 400 }
    );
  }

  console.log(`✅ [Working Hours] Task reject allowed - within working hours`);

  let keterangan = '';
  try {
    const body = await req.json();
    keterangan = body?.keterangan || '';
  } catch {
    // ignore parse error
  }

  if (!keterangan.trim()) {
    return NextResponse.json(
      { error: 'keterangan (alasan reject) wajib diisi' },
      { status: 400 }
    );
  }

  const task = await prisma.tasklist.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'MENUNGGU_REVIEW_PM') {
    return NextResponse.json(
      { error: `Cannot reject. Current status: ${task.status}` },
      { status: 422 }
    );
  }

  // Reject = kembalikan ke MENUNGGU_PROSES_USER
  const updated = await prisma.tasklist.update({
    where: { id },
    data: { status: 'MENUNGGU_PROSES_USER' }
  });

  // Log activity
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.tasklist_log ("taskId", "userId", keterangan, status, action)
       VALUES ($1, $2, $3, $4, $5)`,
      id, session.id, keterangan, 'MENUNGGU_PROSES_USER', 'status_change'
    );
  } catch {
    // log non-fatal
  }

  return NextResponse.json({
    success: true,
    message: 'Task rejected',
    data: {
      id: updated.id,
      kode: updated.kode,
      status: updated.status,
      keterangan,
      updatedAt: updated.updatedAt
    }
  });
}
