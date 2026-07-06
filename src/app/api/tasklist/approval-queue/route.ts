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

// GET /api/tasklist/approval-queue
// Endpoint khusus untuk PM/Manager mendapatkan daftar task yang perlu di-approve
export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/tasklist/approval-queue - Starting request');

    // Parse user from API key or session
    const user = getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Missing API key or session' }, { status: 401 });
    }

    // Hanya PM, ADMIN, dan SUPER_ADMIN yang bisa mengakses approval queue
    if (!['PM', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Only PM, ADMIN, and SUPER_ADMIN can access approval queue' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const projectIdParam = searchParams.get('projectId');
    const moduleIdParam = searchParams.get('moduleId');
    const pegawaiIdParam = searchParams.get('pegawaiId');
    const pageParam = Number(searchParams.get('page') || '1');
    const sizeParam = Number(searchParams.get('size') || '10');
    const sortKey = String(searchParams.get('sortKey') || 'scheduleAt').trim();
    const sortDir = (String(searchParams.get('sortDir') || 'asc').toLowerCase() === 'desc') ? 'desc' : 'asc';

    // Base filter: hanya task dengan status MENUNGGU_REVIEW_PM
    let where: Prisma.TasklistWhereInput = {
      status: 'MENUNGGU_REVIEW_PM'
    };

    // Role-based access control
    if (user.role === 'PM') {
      // PM hanya bisa melihat task dari tim mereka saja
      const teams = await prisma.proyekTeam.findMany({ 
        where: { pegawaiId: user.id },
        select: { projectId: true, jabatan: true }
      });
      
      const projectIds = teams.map(t => t.projectId);

      if (projectIds.length === 0) {
        // PM tidak ada di team manapun, tidak ada task yang bisa dilihat
        // Return empty result dengan kondisi yang tidak mungkin terpenuhi
        where.id = -1;
      } else {
        // PM hanya bisa lihat task di project tim mereka
        where.projectId = { in: projectIds };
      }
    }
    // ADMIN dan SUPER_ADMIN bisa melihat semua task approval

    // Apply additional filters
    if (projectIdParam) {
      const pid = Number(projectIdParam);
      if (Number.isFinite(pid)) {
        if (user.role === 'PM') {
          // Untuk PM, pastikan mereka punya akses ke project ini
          const hasAccess = await prisma.proyekTeam.findFirst({
            where: { 
              pegawaiId: user.id,
              projectId: pid
            }
          });
          
          if (hasAccess) {
            where.projectId = pid;
          } else {
            // PM tidak punya akses ke project ini, hanya tampilkan task yang mereka buat
            where = {
              ...where,
              projectId: pid,
              createdBy: user.id
            };
          }
        } else {
          where.projectId = pid;
        }
      }
    }

    if (moduleIdParam) {
      const mid = Number(moduleIdParam);
      if (Number.isFinite(mid)) {
        where.moduleId = mid;
      }
    }

    if (pegawaiIdParam) {
      const eid = Number(pegawaiIdParam);
      if (Number.isFinite(eid)) {
        where.pegawaiId = eid;
      }
    }

    // Pagination
    const page = Math.max(1, pageParam);
    const size = Math.min(100, Math.max(1, sizeParam));
    const skip = (page - 1) * size;

    // Sorting
    const validSortKeys = ['scheduleAt', 'createdAt', 'updatedAt', 'kode', 'id'];
    const finalSortKey = validSortKeys.includes(sortKey) ? sortKey : 'scheduleAt';
    
    const orderBy: Prisma.TasklistOrderByWithRelationInput = {};
    orderBy[finalSortKey as keyof Prisma.TasklistOrderByWithRelationInput] = sortDir;

    console.log(`[APPROVAL QUEUE] User ${session.id} (${session.role}) - Filter:`, JSON.stringify(where, null, 2));

    // Get total count
    const total = await prisma.tasklist.count({ where });

    // Get tasks with related data
    const tasks = await prisma.tasklist.findMany({
      where,
      include: {
        proyek: {
          select: { id: true, namaProyek: true }
        },
        proyekModule: {
          select: { id: true, nama: true, kode: true }
        },
        pegawai: {
          select: { id: true, namaLengkap: true }
        },
        creator: {
          select: { id: true, namaLengkap: true }
        }
      },
      orderBy,
      skip,
      take: size
    });

    // Transform data untuk response
    const items = tasks.map(task => {
      // Calculate available actions for each task
      const availableActions: string[] = [];
      
      // PM/Creator bisa approve atau reject
      const isCreator = task.createdBy === user.id;
      const canApprove = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || isCreator;
      
      if (canApprove) {
        availableActions.push('approve', 'reject');
      }
      
      // Admin bisa edit dan delete
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        availableActions.push('edit', 'delete');
      }

      return {
        id: task.id,
        kode: task.kode,
        projectId: task.projectId,
        moduleId: task.moduleId,
        pegawaiId: task.pegawaiId,
        createdBy: task.createdBy,
        status: task.status,
        statusCode: 3, // MENUNGGU_REVIEW_PM = 3
        statusText: 'Menunggu Review PM',
        proyekNama: task.proyek?.namaProyek || 'Unknown Project',
        moduleNama: task.proyekModule?.nama || 'Unknown Module',
        moduleKode: task.proyekModule?.kode || '',
        pegawaiNama: task.pegawai?.namaLengkap || 'Unknown User',
        creatorNama: task.creator?.namaLengkap || 'Unknown Creator',
        scheduleAt: task.scheduleAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        keterangan: task.keterangan,
        taskComplexity: task.taskComplexity,
        estimatedHours: task.estimatedHours,
        tasklistType: task.tasklistType,
        availableActions,
        // Additional info for approval
        waitingDays: Math.floor((new Date().getTime() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
        isOverdue: task.scheduleAt ? new Date() > new Date(task.scheduleAt) : false
      };
    });

    // Summary statistics
    const summary = {
      totalPending: total,
      overdueCount: items.filter(item => item.isOverdue).length,
      avgWaitingDays: items.length > 0 ? Math.round(items.reduce((sum, item) => sum + item.waitingDays, 0) / items.length) : 0
    };

    console.log(`[APPROVAL QUEUE] Returning ${items.length} tasks for user ${user.id}`);

    return NextResponse.json({
      items,
      total,
      page,
      size,
      summary,
      hasNextPage: skip + size < total,
      hasPrevPage: page > 1
    });

  } catch (error) {
    console.error('Error fetching approval queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}