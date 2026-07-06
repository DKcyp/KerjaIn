import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { withCORS } from '@/lib/cors';

/**
 * GET /api/tasklist/action-count
 * Returns the number of tasklist items that require an action from the current user.
 *
 * Mirrors the exact same visibility + action conditions used in the tasklist page:
 *   - Only excludes SELESAI tasks with scheduleAt < today (same as main tasklist filter)
 *   - Does NOT filter non-SELESAI tasks by scheduleAt
 *
 * For PM / SUPER_ADMIN:
 *   Count A: MENUNGGU_REVIEW_PM approvable (user is PM in project, creator NOT PIC)
 *   Count B: assignee tasks needing Kirim Review (SEDANG_DIPROSES_USER + started_at) or Mulai (MENUNGGU_PROSES_USER)
 *
 * For PROGRAMMER / ADMIN:
 *   Count: assignee tasks needing Kirim Review or Mulai
 */
async function handleGET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!session?.id) {
      return NextResponse.json({ count: 0 });
    }

    const userId = session.id;

    // Same exclusion rule as main tasklist: hide SELESAI tasks with past scheduleAt
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Common exclusion: NOT (status = 'SELESAI' AND scheduleAt < today)
    const notPastSelesai = `NOT (t.status = 'SELESAI' AND t."scheduleAt" < $2)`;

    let count = 0;

    if (session.role === 'PM' || session.role === 'SUPER_ADMIN') {
      // Count A: MENUNGGU_REVIEW_PM tasks that show Approve/Reject buttons
      // Conditions mirror the render condition in tasklist/page.tsx:
      //   - status = MENUNGGU_REVIEW_PM
      //   - user is PM in that project (jabatan ILIKE '%PM%')
      //   - creator is NOT a PIC (or no creator, or creator is self)
      const reviewRows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(`
        SELECT COUNT(*) AS cnt
        FROM tasklist t
        WHERE ${notPastSelesai}
          AND t.status = 'MENUNGGU_REVIEW_PM'
          AND t."pegawaiId" IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM proyek_team pt_user
            WHERE pt_user."projectId" = t."projectId"
              AND pt_user."pegawaiId" = $1
              AND pt_user.jabatan ILIKE '%PM%'
          )
          AND (
            t."createdBy" IS NULL
            OR t."createdBy" = $1
            OR NOT EXISTS (
              SELECT 1 FROM proyek_team pt_creator
              WHERE pt_creator."projectId" = t."projectId"
                AND pt_creator."pegawaiId" = t."createdBy"
                AND pt_creator.jabatan ILIKE '%PIC%'
            )
          )
      `, userId, today);

      count += Number(reviewRows[0]?.cnt ?? 0);

      // Count B: tasks where PM is the assignee and needs to Kirim Review or Mulai
      const assigneeRows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(`
        SELECT COUNT(*) AS cnt
        FROM tasklist t
        WHERE ${notPastSelesai}
          AND t."pegawaiId" = $1
          AND (
            (t.status = 'SEDANG_DIPROSES_USER' AND t.started_at IS NOT NULL)
            OR t.status = 'MENUNGGU_PROSES_USER'
          )
      `, userId, today);

      count += Number(assigneeRows[0]?.cnt ?? 0);

    } else {
      // PROGRAMMER / ADMIN: tasks assigned to user needing Kirim Review or Mulai
      const rows = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(`
        SELECT COUNT(*) AS cnt
        FROM tasklist t
        WHERE ${notPastSelesai}
          AND t."pegawaiId" = $1
          AND (
            (t.status = 'SEDANG_DIPROSES_USER' AND t.started_at IS NOT NULL)
            OR t.status = 'MENUNGGU_PROSES_USER'
          )
      `, userId, today);

      count += Number(rows[0]?.cnt ?? 0);
    }

    return NextResponse.json({ count });
  } catch (err) {
    console.error('[action-count] error:', err);
    return NextResponse.json({ count: 0 });
  }
}

export const GET = withCORS(handleGET);
