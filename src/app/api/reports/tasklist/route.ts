import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

export const runtime = 'nodejs';

// Map status code to text
const codeToText = (code: number): string => {
  switch (code) {
    case 1: return 'Menunggu Proses';
    case 2: return 'Sedang Diproses';
    case 5: return 'Sedang Diproses (Paused)';
    case 3: return 'Menunggu Review PM';
    case 4: return 'Selesai';
    default: return 'Menunggu Proses';
  }
};

// GET /api/reports/tasklist - Fetch all tasklists for reporting
export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse filters from query params
    const { searchParams } = new URL(req.url);
    const projectIdParam = searchParams.get('projectId');
    const moduleIdParam = searchParams.get('moduleId');
    const pegawaiIdParam = searchParams.get('pegawaiId');
    const statusParam = searchParams.get('status');
    const tasklistTypeParam = searchParams.get('tasklistType');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const isLateParam = searchParams.get('isLate'); // 'true' or 'false'
    
    // Pagination params
    const isExport = searchParams.get('export') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Build SQL WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Apply role-based filters
    if (session.role === 'PROGRAMMER') {
      // Check if user has PM or PIC role in any project
      const userTeamRoles = await prisma.proyekTeam.findMany({
        where: { pegawaiId: session.id },
        select: { projectId: true, jabatan: true }
      });

      const pmProjectIds: number[] = [];
      const picProjectIds: number[] = [];

      for (const team of userTeamRoles) {
        const jabatanUpper = team.jabatan.toUpperCase();
        if (jabatanUpper.includes('PM')) {
          pmProjectIds.push(team.projectId);
        }
        if (jabatanUpper.includes('PIC')) {
          picProjectIds.push(team.projectId);
        }
      }

      if (pmProjectIds.length > 0 || picProjectIds.length > 0) {
        const managerProjectIds = [...new Set([...pmProjectIds, ...picProjectIds])];
        conditions.push(`(t."projectId" = ANY($${paramIndex}::int[]) OR t."pegawaiId" = $${paramIndex + 1})`);
        params.push(managerProjectIds, session.id);
        paramIndex += 2;
      } else {
        conditions.push(`t."pegawaiId" = $${paramIndex}`);
        params.push(session.id);
        paramIndex++;
      }
    } else if (session.role === 'PM') {
      const teams = await prisma.proyekTeam.findMany({ 
        where: { pegawaiId: session.id } 
      });
      const projectIds = teams.map(t => t.projectId);
      
      if (projectIds.length > 0) {
        conditions.push(`t."projectId" = ANY($${paramIndex}::int[])`);
        params.push(projectIds);
        paramIndex++;
      } else {
        conditions.push(`t."createdBy" = $${paramIndex}`);
        params.push(session.id);
        paramIndex++;
      }
    }

    // Apply filters
    if (projectIdParam) {
      const pid = Number(projectIdParam);
      if (Number.isFinite(pid)) {
        conditions.push(`t."projectId" = $${paramIndex}`);
        params.push(pid);
        paramIndex++;
      }
    }

    if (moduleIdParam) {
      const mid = Number(moduleIdParam);
      if (Number.isFinite(mid)) {
        conditions.push(`t."moduleId" = $${paramIndex}`);
        params.push(mid);
        paramIndex++;
      }
    }

    if (pegawaiIdParam && (session.role === 'SUPER_ADMIN' || session.role === 'PM' || session.role === 'ADMIN')) {
      const eid = Number(pegawaiIdParam);
      if (Number.isFinite(eid)) {
        conditions.push(`t."pegawaiId" = $${paramIndex}`);
        params.push(eid);
        paramIndex++;
      }
    }

    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim());
      const validStatuses = ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI'];
      const filtered = statuses.filter(s => validStatuses.includes(s));
      
      if (filtered.length > 0) {
        conditions.push(`t.status::text = ANY($${paramIndex}::text[])`);
        params.push(filtered);
        paramIndex++;
      }
    }

    if (tasklistTypeParam) {
      const validTypes = ['BLUEPRINT', 'DEVELOPMENT', 'MAINTENANCE'];
      if (validTypes.includes(tasklistTypeParam)) {
        conditions.push(`t."tasklistType" = $${paramIndex}`);
        params.push(tasklistTypeParam);
        paramIndex++;
      }
    }

    // Date range filter - using DATE() to compare only date part (ignoring time and timezone)
    if (fromParam) {
      conditions.push(`DATE(t."scheduleAt") >= $${paramIndex}::date`);
      params.push(fromParam); // Pass as string 'YYYY-MM-DD'
      paramIndex++;
    }
    
    if (toParam) {
      conditions.push(`DATE(t."scheduleAt") <= $${paramIndex}::date`);
      params.push(toParam); // Pass as string 'YYYY-MM-DD'
      paramIndex++;
    }

    if (isLateParam === 'true') {
      conditions.push(`t."calculatedDueDate" IS NOT NULL AND t."calculatedDueDate" < NOW() AND t.status::text != 'SELESAI'`);
    } else if (isLateParam === 'false') {
      conditions.push(`(t."calculatedDueDate" IS NULL OR t."calculatedDueDate" >= NOW() OR t.status::text = 'SELESAI')`);
    }

    // Build final query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Count total for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tasklist t
      ${whereClause}
    `;
    
    const countResult: any[] = await prisma.$queryRawUnsafe(countQuery, ...params);
    const total = parseInt(countResult[0]?.total || '0');
    
    // Add pagination to main query (skip for export)
    const limitClause = isExport ? '' : `LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
    
    const query = `
      SELECT 
        t.id,
        t.kode,
        t."projectId",
        t."moduleId",
        t."pegawaiId",
        t."createdBy",
        t."scheduleAt",
        t."calculatedDueDate",
        t.status,
        COALESCE(t."statusCode", 1) as "statusCode",
        t."tasklistType",
        t."taskComplexity",
        t.custom_duration_hours as "customDurationHours",
        t.keterangan,
        t.programmer_description as "programmerDescription",
        t.id_crm as "idCrm",
        t.ticket_id as "ticketId",
        t.ticket_url as "ticketUrl",
        t.is_paused as "isPaused",
        t.total_duration_minutes as "totalDurationMinutes",
        t."createdAt",
        t."updatedAt",
        m.nama as "moduleName",
        m.kode as "moduleCode",
        p."namaProyek" as "projectName",
        p."kodeProyek" as "projectCode",
        peg."namaLengkap" as "assigneeName",
        peg.role as "assigneeRole",
        creator."namaLengkap" as "creatorName",
        pt.jabatan as "assigneeJabatan",
        (
          COALESCE(
            (
              SELECT MIN(tl.waktu)
              FROM tasklist_log tl
              WHERE tl."taskId" = t.id
                AND tl."action" = 'STATUS_CHANGE'
                AND tl.keterangan LIKE '%Task dikirim untuk review%'
            ),
            (
              SELECT MIN(tl.waktu) - INTERVAL '7 hours'
              FROM tasklist_log tl
              WHERE tl."taskId" = t.id
                AND tl."action" = 'STATUS_CHANGE'
                AND tl.keterangan LIKE '%telah dikirim menunggu review%'
            )
          )
        ) as "sentForReviewAt"
      FROM tasklist t
      LEFT JOIN proyek_module m ON t."moduleId" = m.id
      LEFT JOIN proyek p ON t."projectId" = p.id
      LEFT JOIN pegawai peg ON t."pegawaiId" = peg.id
      LEFT JOIN pegawai creator ON t."createdBy" = creator.id
      LEFT JOIN proyek_team pt ON t."projectId" = pt."projectId" AND t."pegawaiId" = pt."pegawaiId"
      ${whereClause}
      ORDER BY t."scheduleAt" DESC
      ${limitClause}
    `;
    
    console.log('=== MAIN QUERY ===');
    console.log(query);
    console.log('=== MAIN QUERY PARAMS ===');
    console.log(params);
    console.log('=== END SQL DEBUG ===');

    console.log('=== FULL SQL QUERY ===');
    console.log(query);
    console.log('=== QUERY PARAMS ===');
    console.log(params);
    console.log('=== END QUERY ===');

    const tasklists: any[] = await prisma.$queryRawUnsafe(query, ...params);

    // Format response
    const items = tasklists.map(task => {
      // Determine status code - prioritize status enum over statusCode field
      let statusCode = 1; // default
      
      if (task.status) {
        // Map status enum to code (this is the source of truth)
        switch (task.status) {
          case 'MENUNGGU_PROSES_USER': statusCode = 1; break;
          case 'SEDANG_DIPROSES_USER': statusCode = 2; break;
          case 'MENUNGGU_REVIEW_PM': statusCode = 3; break;
          case 'SELESAI': statusCode = 4; break;
          case 'SEDANG_DIPROSES_USER_PAUSED': statusCode = 5; break;
          default: statusCode = 1;
        }
      } else if (task.statusCode != null && typeof task.statusCode === 'number') {
        // Fallback to statusCode if status enum is not available
        statusCode = task.statusCode;
      }
      
      return {
        id: task.id,
        kode: task.kode,
        projectCode: task.projectCode || '',
        projectName: task.projectName || '',
        moduleCode: task.moduleCode || '',
        moduleName: task.moduleName || '',
        assigneeName: task.assigneeName || '',
        assigneeRole: task.assigneeRole || '',
        assigneeJabatan: task.assigneeJabatan || '',
        creatorName: task.creatorName || '',
        scheduleAt: task.scheduleAt ? new Date(task.scheduleAt).toISOString() : '',
        calculatedDueDate: task.calculatedDueDate ? new Date(task.calculatedDueDate).toISOString() : null,
        status: task.status,
        statusCode: statusCode,
        statusText: codeToText(statusCode),
        tasklistType: task.tasklistType,
        taskComplexity: task.taskComplexity,
        customDurationHours: task.customDurationHours ? Number(task.customDurationHours) : null,
        keterangan: task.keterangan || '',
        programmerDescription: task.programmerDescription || '',
        idCrm: task.idCrm || '',
        ticketId: task.ticketId || '',
        ticketUrl: task.ticketUrl || '',
        isPaused: task.isPaused || false,
        totalDurationMinutes: task.totalDurationMinutes || 0,
        createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : '',
        updatedAt: task.updatedAt ? new Date(task.updatedAt).toISOString() : '',
        sentForReviewAt: task.sentForReviewAt ? new Date(task.sentForReviewAt).toISOString() : null
      };
    });

    return NextResponse.json({ 
      success: true,
      items,
      total,
      page: isExport ? 1 : page,
      pageSize: isExport ? total : pageSize
    });

  } catch (e) {
    console.error('GET /api/reports/tasklist error:', e);
    return NextResponse.json(
      { error: 'Server error', message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
