import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader, parseSessionFromRequest } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// Hardcoded API Keys untuk mobile app
const VALID_API_KEYS = {
  'mobile-app-key-2024': {
    id: 1,
    role: 'PM',
    namaLengkap: 'Mobile App User'
  },
  'admin-key-2024': {
    id: 2,
    role: 'ADMIN',
    namaLengkap: 'Admin User'
  },
  'super-admin-key-2024': {
    id: 3,
    role: 'SUPER_ADMIN',
    namaLengkap: 'Super Admin User'
  }
};

// Function to get user from API key or session
function getUserFromRequest(req: NextRequest) {
  // Try API Key first
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-KEY');
  if (apiKey && VALID_API_KEYS[apiKey]) {
    console.log(`[API KEY AUTH] Valid API key used: ${apiKey}`);
    return VALID_API_KEYS[apiKey];
  }

  // Fallback to session
  const cookieHeader = req.headers.get('cookie');
  const session = parseSessionFromCookieHeader(cookieHeader);
  if (session) {
    console.log(`[SESSION AUTH] Valid session used: ${session.id}`);
    return session;
  }

  return null;
}

// GET /api/tasklist/approval-stats
// Endpoint untuk mendapatkan statistik approval untuk PM/Manager dashboard
export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/tasklist/approval-stats - Starting request');

    // Parse user from API key or session
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Missing API key or session' }, { status: 401 });
    }

    // Hanya PM, ADMIN, dan SUPER_ADMIN yang bisa mengakses approval stats
    if (!['PM', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Only PM, ADMIN, and SUPER_ADMIN can access approval stats' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const projectIdParam = searchParams.get('projectId');
    const periodParam = searchParams.get('period') || '30'; // default 30 days

    // Base filter berdasarkan role
    let baseWhere: Prisma.TasklistWhereInput = {};
    
    if (user.role === 'PM') {
      // PM hanya bisa melihat statistik dari project mereka
      const teams = await prisma.proyekTeam.findMany({ 
        where: { pegawaiId: user.id },
        select: { projectId: true }
      });
      
      const projectIds = teams.map(t => t.projectId);

      if (projectIds.length === 0) {
        // PM tidak ada di team manapun, hanya task yang mereka buat
        baseWhere.createdBy = user.id;
      } else {
        baseWhere.OR = [
          { projectId: { in: projectIds } },
          { createdBy: user.id }
        ];
      }
    }
    // ADMIN dan SUPER_ADMIN bisa melihat semua statistik

    // Apply project filter if specified
    if (projectIdParam) {
      const pid = Number(projectIdParam);
      if (Number.isFinite(pid)) {
        if (user.role === 'PM') {
          // Pastikan PM punya akses ke project ini
          const hasAccess = await prisma.proyekTeam.findFirst({
            where: { 
              pegawaiId: user.id,
              projectId: pid
            }
          });
          
          if (hasAccess) {
            baseWhere.projectId = pid;
          } else {
            baseWhere = {
              ...baseWhere,
              projectId: pid,
              createdBy: user.id
            };
          }
        } else {
          baseWhere.projectId = pid;
        }
      }
    }

    // Date range untuk periode statistik
    const days = Math.min(365, Math.max(1, Number(periodParam)));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`[APPROVAL STATS] User ${user.id} (${user.role}) - Period: ${days} days, Filter:`, JSON.stringify(baseWhere, null, 2));

    // 1. Current pending approvals
    const pendingApprovals = await prisma.tasklist.count({
      where: {
        ...baseWhere,
        status: 'MENUNGGU_REVIEW_PM'
      }
    });

    // 2. Overdue approvals (scheduled before today but still pending)
    const overdueApprovals = await prisma.tasklist.count({
      where: {
        ...baseWhere,
        status: 'MENUNGGU_REVIEW_PM',
        scheduleAt: {
          lt: new Date()
        }
      }
    });

    // 3. Approved tasks in period
    const approvedTasks = await prisma.tasklist.count({
      where: {
        ...baseWhere,
        status: 'SELESAI',
        updatedAt: {
          gte: startDate
        }
      }
    });

    // 4. Rejected tasks in period (tasks that went back to MENUNGGU_PROSES_USER)
    // We'll use activity log to track rejections
    const rejectedTasks = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT tl."taskId") as count
      FROM tasklist_log tl
      INNER JOIN tasklist t ON t.id = tl."taskId"
      WHERE tl.action = 'status_change'
      AND tl.status = 'MENUNGGU_PROSES_USER'
      AND tl.waktu >= ${startDate}
      AND tl.waktu IN (
        SELECT MAX(tl2.waktu)
        FROM tasklist_log tl2
        WHERE tl2."taskId" = tl."taskId"
        AND tl2.action = 'status_change'
        AND tl2.status IN ('MENUNGGU_PROSES_USER', 'SELESAI')
        AND tl2.waktu >= ${startDate}
      )
      ${session.role === 'PM' && baseWhere.OR ? 
        Prisma.sql`AND (t."projectId" IN (${Prisma.join(
          (baseWhere.OR[0] as any)?.projectId?.in || []
        )}) OR t."createdBy" = ${user.id})` : 
        user.role === 'PM' && baseWhere.createdBy ? 
        Prisma.sql`AND t."createdBy" = ${user.id}` :
        projectIdParam ? Prisma.sql`AND t."projectId" = ${Number(projectIdParam)}` :
        Prisma.empty
      }
    `;

    // 5. Average approval time (from MENUNGGU_REVIEW_PM to SELESAI)
    const avgApprovalTime = await prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
      SELECT AVG(
        EXTRACT(EPOCH FROM (approved.waktu - submitted.waktu)) / 3600
      ) as avg_hours
      FROM (
        SELECT tl."taskId", MIN(tl.waktu) as waktu
        FROM tasklist_log tl
        INNER JOIN tasklist t ON t.id = tl."taskId"
        WHERE tl.action = 'status_change'
        AND tl.status = 'MENUNGGU_REVIEW_PM'
        AND tl.waktu >= ${startDate}
        ${session.role === 'PM' && baseWhere.OR ? 
          Prisma.sql`AND (t."projectId" IN (${Prisma.join(
            (baseWhere.OR[0] as any)?.projectId?.in || []
          )}) OR t."createdBy" = ${session.id})` : 
          session.role === 'PM' && baseWhere.createdBy ? 
          Prisma.sql`AND t."createdBy" = ${session.id}` :
          projectIdParam ? Prisma.sql`AND t."projectId" = ${Number(projectIdParam)}` :
          Prisma.empty
        }
        GROUP BY tl."taskId"
      ) submitted
      INNER JOIN (
        SELECT tl."taskId", MIN(tl.waktu) as waktu
        FROM tasklist_log tl
        INNER JOIN tasklist t ON t.id = tl."taskId"
        WHERE tl.action = 'status_change'
        AND tl.status = 'SELESAI'
        AND tl.waktu >= ${startDate}
        ${session.role === 'PM' && baseWhere.OR ? 
          Prisma.sql`AND (t."projectId" IN (${Prisma.join(
            (baseWhere.OR[0] as any)?.projectId?.in || []
          )}) OR t."createdBy" = ${session.id})` : 
          session.role === 'PM' && baseWhere.createdBy ? 
          Prisma.sql`AND t."createdBy" = ${session.id}` :
          projectIdParam ? Prisma.sql`AND t."projectId" = ${Number(projectIdParam)}` :
          Prisma.empty
        }
        GROUP BY tl."taskId"
      ) approved ON submitted."taskId" = approved."taskId"
      WHERE approved.waktu > submitted.waktu
    `;

    // 6. Tasks by status breakdown
    const statusBreakdown = await prisma.tasklist.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: {
        id: true
      }
    });

    // 7. Top assignees with pending approvals
    const topAssignees = await prisma.tasklist.groupBy({
      by: ['pegawaiId'],
      where: {
        ...baseWhere,
        status: 'MENUNGGU_REVIEW_PM'
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    // Get assignee names
    const assigneeIds = topAssignees.map(a => a.pegawaiId).filter(id => id !== null);
    const assignees = await prisma.pegawai.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, namaLengkap: true }
    });

    const assigneeMap = new Map(assignees.map(a => [a.id, a.namaLengkap]));

    // 8. Daily approval trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyApprovals = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(date + 'T23:59:59.999Z');
        
        const count = await prisma.tasklist.count({
          where: {
            ...baseWhere,
            status: 'SELESAI',
            updatedAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        });
        
        return { date, count };
      })
    );

    const response = {
      summary: {
        pendingApprovals,
        overdueApprovals,
        approvedTasks,
        rejectedTasks: Number(rejectedTasks[0]?.count || 0),
        avgApprovalTimeHours: avgApprovalTime[0]?.avg_hours ? Math.round(avgApprovalTime[0].avg_hours * 10) / 10 : null,
        period: `${days} days`
      },
      statusBreakdown: statusBreakdown.map(item => ({
        status: item.status,
        count: item._count.id,
        percentage: statusBreakdown.length > 0 ? 
          Math.round((item._count.id / statusBreakdown.reduce((sum, s) => sum + s._count.id, 0)) * 100) : 0
      })),
      topAssignees: topAssignees.map(item => ({
        pegawaiId: item.pegawaiId,
        pegawaiNama: assigneeMap.get(item.pegawaiId!) || 'Unknown',
        pendingCount: item._count.id
      })),
      dailyTrend: dailyApprovals,
      generatedAt: new Date().toISOString(),
      userId: user.id,
      userRole: user.role
    };

    console.log(`[APPROVAL STATS] Generated stats for user ${user.id}: ${pendingApprovals} pending, ${overdueApprovals} overdue`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching approval stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}