// Updated: 2025-12-04 08:32 - Fixed PM/PIC dual-role visibility
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { calculateSlaDeadlines } from '@/lib/slaCalculator';
import { setTaskDueDateOnCreate } from '@/lib/taskDueDateCalculator';
import { determineComplexityFromHours } from '@/lib/determineComplexityFromHours';
import { sendWhatsAppMessage, formatTaskAssignmentMessage, cleanPhoneNumber } from '@/lib/whatsappService';
import { sendTaskNotification, notificationTemplates } from '@/lib/notificationHelper';
import { Prisma, TaskStatus, TasklistType, SlaType } from '@prisma/client';
import { generateTasklistKode } from '@/lib/generateKode';
import fs from 'fs/promises';
import path from 'path';
import { validateFile } from '@/lib/fileUploadConfig';
import { addWorkingHours, DEFAULT_CONFIG } from '@/lib/workingHoursCalculator';
import { calculateTaskSchedule } from '@/lib/smartScheduling';
import { validateWorkload } from '@/lib/workloadValidation';

export const runtime = 'nodejs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Ensure log table exists without requiring Prisma migrations (safe, non-destructive)
async function ensureLogTable() {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS public.tasklist_log (
        id SERIAL PRIMARY KEY,
        "taskId" INT NOT NULL,
        waktu TIMESTAMP NOT NULL DEFAULT NOW(),
        "userId" INT NOT NULL,
        keterangan TEXT NULL,
        status TEXT NULL,
        action TEXT NOT NULL
      );`
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_task_waktu ON public.tasklist_log ("taskId", waktu DESC);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_user ON public.tasklist_log ("userId");`);
  } catch {
    // ignore
  }
}

// Ensure image table exists
async function ensureImageTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.tasklist_image (
        id SERIAL PRIMARY KEY,
        "taskId" INT NOT NULL,
        "fileName" TEXT NOT NULL,
        "originalName" TEXT NOT NULL,
        "filePath" TEXT NOT NULL,
        "fileType" TEXT NOT NULL,
        "fileSize" INT NOT NULL,
        "uploadedBy" INT,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS tasklist_image_taskId_idx ON public.tasklist_image("taskId");`);
  } catch (e) {
    console.error('Failed to ensure tasklist_image table:', e);
  }
}
// Map between 1-digit code and enum string
const codeToStatus = (code: number | null | undefined): string => {
  switch (code) {
    case 1: return 'MENUNGGU_PROSES_USER';
    case 2: return 'SEDANG_DIPROSES_USER';
    case 5: return 'SEDANG_DIPROSES_USER_PAUSED';
    case 3: return 'MENUNGGU_REVIEW_PM';
    case 4: return 'SELESAI';
    default: return 'MENUNGGU_PROSES_USER';
  }
};
const statusToCode = (status: string | null | undefined): number => {
  switch (status) {
    case 'MENUNGGU_PROSES_USER': return 1;
    case 'SEDANG_DIPROSES_USER': return 2;
    case 'SEDANG_DIPROSES_USER_PAUSED': return 5;
    case 'MENUNGGU_REVIEW_PM': return 3;
    case 'SELESAI': return 4;
    default: return 1;
  }
};
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

import { withCORS } from '@/lib/cors';

// GET /api/tasklist
async function handleGET(req: NextRequest) {
  try {
    console.log('GET /api/tasklist - Starting request');

    // Test Prisma client connection
    try {
      await prisma.$connect();
      console.log('Prisma client connected successfully');
    } catch (prismaError) {
      console.error('Prisma connection failed:', prismaError);
      throw new Error(`Database connection failed: ${prismaError instanceof Error ? prismaError.message : String(prismaError)}`);
    }

    // derive session and scope by role (PM only sees their projects)
    const cookieHeader = req.headers.get('cookie');
    console.log('Cookie header present:', !!cookieHeader);
    const session = parseSessionFromCookieHeader(cookieHeader);
    console.log('Session parsed:', session ? { id: session.id, role: session.role } : 'null');
    // Parse URL early so we can branch logic based on query params (e.g., projectId)
    const url = new URL(req.url);

    let where: Prisma.TasklistWhereInput = {};
    if (session?.role === 'PM') {
      // PM can see tasks in projects where they are team member OR tasks created by them
      // Note: This will be further refined by visibility filter for SUPPORT/DEV projects
      const teams = await prisma.proyekTeam.findMany({ where: { pegawaiId: session.id } });
      const projectIds = teams.map(t => t.projectId);

      if (projectIds.length === 0) {
        // PM not in any team, but can still see tasks they created
        where = { createdBy: session.id };
        console.log(`[TASKLIST] PM ${session.id} not in any team, showing only created tasks`);
      } else {
        // Initially show tasks in PM's projects - will be filtered later for SUPPORT/DEV
        where = { projectId: { in: projectIds } };
        console.log(`[TASKLIST] PM ${session.id} initial filter: ${projectIds.length} projects (will apply visibility filter later)`);
      }
    } else if (session?.role === 'PROGRAMMER') {
      // Check if PROGRAMMER has PM or PIC jabatan in any project
      const userTeamRoles = await prisma.proyekTeam.findMany({
        where: {
          pegawaiId: session.id
        },
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
        // User is PM or PIC in some projects
        const managerProjectIds = [...new Set([...pmProjectIds, ...picProjectIds])];

        // PM/PIC can see:
        // 1. All tasks in their managed projects
        // 2. Tasks assigned to them in other projects
        where = {
          OR: [
            { projectId: { in: managerProjectIds } },
            { pegawaiId: session.id }
          ]
        };

        console.log(`[TASKLIST] PM/PIC filter applied: user ${session.id} is PM in ${pmProjectIds.length} projects, PIC in ${picProjectIds.length} projects`);
      } else {
        // Regular PROGRAMMER: only see their own tasks
        where = { pegawaiId: session.id };
        console.log(`[TASKLIST] PROGRAMMER filter applied: pegawaiId = ${session.id}, role = ${session.role}`);
      }
    } else if (session?.role === 'ADMIN') {
      // ADMIN can see all tasks but let's add logging
      console.log(`[TASKLIST] ADMIN access: userId = ${session.id}, role = ${session.role}`);
    }
    // ADMIN role can see all tasks (like SUPER_ADMIN) since they need to manage tasks for others
    // Optional filters from query params
    const { searchParams } = url;
    const projectIdParam = searchParams.get('projectId');
    const moduleIdParam = searchParams.get('moduleId');
    const pegawaiIdParam = searchParams.get('pegawaiId');
    const teamIdParam = searchParams.get('teamId');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const statusParam = searchParams.get('status');
    const tasklistTypeParam = searchParams.get('tasklistType');
    const baVersionParam = searchParams.get('baVersion');
    const pageParam = Number(searchParams.get('page') || '1');
    const sizeParam = Number(searchParams.get('size') || '10');
    const sortKey = String(searchParams.get('sortKey') || '').trim();
    const sortDir = (String(searchParams.get('sortDir') || 'asc').toLowerCase() === 'desc') ? 'desc' : 'asc';
    const qWhere: Prisma.TasklistWhereInput = { 
      ...where
    };
    // TODO: Re-enable depId filter once all old data has been migrated
    // if (session?.role !== 'ADMIN' && session?.role !== 'SUPER_ADMIN') {
    //   qWhere.depId = session?.departemenId ?? null;
    // }
    if (projectIdParam) {
      const pid = Number(projectIdParam);
      if (Number.isFinite(pid)) {
        // If PM selected a project explicitly, do not intersect with limited list; allow that project
        if (session?.role === 'PM') {
          qWhere.projectId = pid;
        } else {
          // Type-safe check: ensure where.projectId is an object with 'in' property before accessing
          if (where.projectId && typeof where.projectId === 'object' && 'in' in where.projectId) {
            const projectIds = (where.projectId as { in: number[] }).in;
            qWhere.projectId = { in: projectIds.filter((id: number) => id === pid) };
          } else {
            qWhere.projectId = pid;
          }
        }
      }
    }
    if (moduleIdParam) {
      const mid = Number(moduleIdParam);
      if (Number.isFinite(mid)) qWhere.moduleId = mid;
    }
    if (pegawaiIdParam) {
      const eid = Number(pegawaiIdParam);
      if (Number.isFinite(eid)) {
        if (session?.role === 'PROGRAMMER') {
          // PROGRAMMER tidak boleh menggunakan pegawaiId filter untuk melihat task orang lain
          // Paksa tetap ke task milik sendiri
          qWhere.pegawaiId = session.id;
          console.log(`[TASKLIST] PROGRAMMER ${session.id} attempted to filter by pegawaiId=${eid}, enforcing own tasks only`);
        } else {
          // SUPER_ADMIN/PM/ADMIN atau request tanpa session (external/public call):
          // tetap hormati pegawaiId dari query parameter.
          qWhere.pegawaiId = eid;
          console.log(`[TASKLIST] Applying pegawaiId filter: ${eid} (requested by ${session?.role || 'ANONYMOUS'})`);
          console.log(`[TASKLIST] Current where filter:`, JSON.stringify(where, null, 2));
          console.log(`[TASKLIST] Combined qWhere filter:`, JSON.stringify(qWhere, null, 2));
        }
      }
    }
    // Team filter: restrict assignee (pegawaiId) to members of the selected master team.
    // Intersects with any existing pegawaiId filter (user filter, or PROGRAMMER self-scope).
    if (teamIdParam) {
      const tid = Number(teamIdParam);
      if (Number.isFinite(tid)) {
        const members = await prisma.masterTeamMember.findMany({
          where: { teamId: tid },
          select: { pegawaiId: true },
        });
        const memberIds = members.map(m => m.pegawaiId);

        if (memberIds.length === 0) {
          // Empty team — force no results
          qWhere.pegawaiId = { in: [] };
        } else if (typeof qWhere.pegawaiId === 'number') {
          // Existing single-user filter: keep it only if user is in the team
          qWhere.pegawaiId = memberIds.includes(qWhere.pegawaiId)
            ? qWhere.pegawaiId
            : { in: [] };
        } else {
          qWhere.pegawaiId = { in: memberIds };
        }
        console.log(`[TASKLIST] Applying teamId filter: ${tid} (${memberIds.length} members)`);
      }
    }
    if (statusParam) {
      const s = String(statusParam);

      // Check if comma-separated (multiple statuses)
      if (s.includes(',')) {
        const statuses = s.split(',').map(st => st.trim());
        const validStatuses = ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI'];
        const filtered = statuses.filter(st => validStatuses.includes(st));

        if (filtered.length > 0) {
          qWhere.status = { in: filtered as TaskStatus[] };
        }
      } else {
        // Single status (existing logic)
        if (/^\d+$/.test(s)) {
          const code = Number(s);
          if ([1, 2, 3, 4, 5].includes(code)) {
            qWhere.statusCode = code;
          }
        } else {
          const validStatuses = ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI'] as const;
          if (validStatuses.includes(s as TaskStatus)) {
            qWhere.status = s as TaskStatus;
          }
        }
      }
    }
    if (tasklistTypeParam) {
      const t = String(tasklistTypeParam);
      const validTasklistTypes = ['BLUEPRINT', 'DEVELOPMENT', 'MAINTENANCE'] as const;
      if (validTasklistTypes.includes(t as TasklistType)) {
        qWhere.tasklistType = t as TasklistType;
      }
    }
    if (baVersionParam) {
      const v = String(baVersionParam).trim();
      if (v) {
        qWhere.baVersion = v;
      }
    }

    // Optional date range (scheduleAt date-only, inclusive bounds)
    const makeDateAt = (dateStr: string, endOfDay = false): Date | null => {
      const s = String(dateStr || '').trim();
      if (!s.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
      try {
        // Construct local date at 00:00 or 23:59:59.999 to avoid TZ shifts
        const [y, m, d] = s.split('-').map((v) => Number(v));
        const dt = new Date(y, (m || 1) - 1, d || 1, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
        return dt;
      } catch {
        return null;
      }
    };
    const fromDate = fromParam ? makeDateAt(fromParam, false) : null;
    const toDate = toParam ? makeDateAt(toParam, true) : null;
    if (fromDate && toDate) qWhere.scheduleAt = { gte: fromDate, lte: toDate };
    else if (fromDate) qWhere.scheduleAt = { gte: fromDate };
    else if (toDate) qWhere.scheduleAt = { lte: toDate };

    // Exclude unassigned tasks (pegawaiId = NULL) - these are tasks returned to backlog
    // Only include tasks that have an assignee
    // IMPORTANT: Only apply this guard when pegawaiId hasn't already been restricted by a
    // role filter (e.g. PROGRAMMER's own-tasks rule) or by an explicit filter (team / user).
    // Otherwise this would overwrite an existing constraint with `{ not: null }` and
    // expose ALL assigned tasks.
    if (!pegawaiIdParam) {
      if (qWhere.pegawaiId === undefined) {
        // No restriction at all: just exclude unassigned tasks.
        qWhere.pegawaiId = { not: null as unknown as number };
      }
      // Any existing restriction (number, { in: [...] }, etc.) is preserved.
    }

    // SUPPORT/DEV Project Visibility Filter: PM sees only their tasks, PIC sees all
    if (session?.id && where.projectId && typeof where.projectId === 'object' && 'in' in where.projectId) {
      const projectIds = (where.projectId as { in: number[] }).in;

      // Check if any projects are SUPPORT or DEV with region
      // For DEV projects, check if they have region team members (teamSource='region')
      const supportProjects = await prisma.proyek.findMany({
        where: {
          id: { in: projectIds },
          type: { in: ['SUPPORT', 'DEVELOPMENT'] }
        },
        select: { id: true, type: true }
      });

      // Filter to only include projects that actually use region-based teams
      const projectsWithRegion: number[] = [];
      for (const proj of supportProjects) {
        const hasRegionTeam = await prisma.proyekTeam.findFirst({
          where: {
            projectId: proj.id,
            teamSource: 'region'
          }
        });

        // SUPPORT always uses region, DEV only if it has region team members
        if (proj.type === 'SUPPORT' || (proj.type === 'DEVELOPMENT' && hasRegionTeam)) {
          projectsWithRegion.push(proj.id);
        }
      }

      const supportProjectsFiltered = projectsWithRegion;

      if (supportProjectsFiltered.length > 0) {
        // Check if user is inherited PM in any SUPPORT/DEV project with region
        const inheritedPMProjects = await prisma.proyekTeam.findMany({
          where: {
            pegawaiId: session.id,
            projectId: { in: supportProjectsFiltered },
            teamSource: 'inherited',
          },
          select: { projectId: true }
        });

        if (inheritedPMProjects.length > 0) {
          console.log(`🔒 Applying visibility filter: User ${session.id} is inherited PM in ${inheritedPMProjects.length} SUPPORT/DEV projects`);
          console.log(`🔍 DEBUG: User ${session.id} will check tasks for PM/PIC dual-role exclusion logic`);

          // Get PM's subordinates from hierarchy
          const subordinateIds = await prisma.teamHierarchy.findMany({
            where: {
              projectId: { in: inheritedPMProjects.map(p => p.projectId) },
              managerId: session.id,
              isActive: true,
            },
            select: { memberId: true }
          });

          const subordinateIdList = subordinateIds.map(s => s.memberId);

          // Get all tasks in these projects
          const allTasksInProjects = await prisma.tasklist.findMany({
            where: {
              projectId: { in: inheritedPMProjects.map(p => p.projectId) }
            },
            select: {
              id: true,
              createdBy: true,
              pegawaiId: true,
              projectId: true
            }
          });

          // For each task, check if creator is PIC and assignee is region programmer
          const taskIdsToExclude: number[] = [];

          console.log(`📋 Checking ${allTasksInProjects.length} tasks for PIC exclusion...`);

          for (const task of allTasksInProjects) {
            if (!task.createdBy) {
              console.log(`⚠️ Task ${task.id}: No creator, skipping`);
              continue;
            }

            // Get creator's role in project
            const creatorRole = await prisma.proyekTeam.findFirst({
              where: {
                projectId: task.projectId,
                pegawaiId: task.createdBy
              },
              select: { jabatan: true, teamSource: true }
            });

            // Get assignee's role in project
            const assigneeRole = task.pegawaiId ? await prisma.proyekTeam.findFirst({
              where: {
                projectId: task.projectId,
                pegawaiId: task.pegawaiId
              },
              select: { jabatan: true, teamSource: true }
            }) : null;

            console.log(`🔍 Task ${task.id}:`, {
              creator: task.createdBy,
              creatorJabatan: creatorRole?.jabatan,
              creatorSource: creatorRole?.teamSource,
              assignee: task.pegawaiId,
              assigneeJabatan: assigneeRole?.jabatan,
              assigneeSource: assigneeRole?.teamSource
            });

            // If creator is PIC (but NOT also PM) and assignee is region programmer, exclude from PM view
            // Key rule: If PM also holds PIC role, they should see tasks they created
            if (creatorRole && assigneeRole) {
              const creatorIsPIC = creatorRole.jabatan.toUpperCase().includes('PIC');
              const creatorIsPM = creatorRole.jabatan.toUpperCase().includes('PM');
              const assigneeIsRegionProgrammer = assigneeRole.teamSource === 'region' &&
                assigneeRole.jabatan.toUpperCase().includes('PROGRAMMER');

              console.log(`   → Creator is PIC: ${creatorIsPIC}, Creator is PM: ${creatorIsPM}, Assignee is region programmer: ${assigneeIsRegionProgrammer}`);

              // Only exclude if creator is PIC WITHOUT PM role
              if (creatorIsPIC && !creatorIsPM && assigneeIsRegionProgrammer) {
                taskIdsToExclude.push(task.id);
                console.log(`   🚫 EXCLUDED: Task ${task.id} created by PIC (non-PM) for region programmer`);
              } else if (creatorIsPIC && creatorIsPM && assigneeIsRegionProgrammer) {
                console.log(`   ✅ INCLUDED: Task ${task.id} created by PM/PIC dual-role for region programmer`);
              }
            }
          }

          // PM visibility rules:
          // 1. Tasks created by PM themselves
          // 2. Tasks assigned to PM's subordinates or PM
          // 3. BUT exclude tasks created by PIC (who is NOT also PM) for region programmers
          //    - If PM also holds PIC role, they CAN see tasks they created for region programmers
          // 4. IMPORTANT: Respect pegawaiId filter if explicitly provided
          
          // Keep explicit pegawaiId filter from query param if provided.
          // Do not remove it from qWhere, otherwise results can leak to other assignees.
          const explicitPegawaiId = typeof qWhere.pegawaiId === 'number' ? qWhere.pegawaiId : null;
          const managedInheritedProjectIds = inheritedPMProjects.map(p => p.projectId);
          const visibleAssigneeIds = Array.from(new Set([...subordinateIdList, session.id])).filter(Number.isFinite);

          const visibilityFilter: Prisma.TasklistWhereInput = explicitPegawaiId !== null
            ? {
                // With explicit pegawaiId, enforce assignee match strictly in inherited PM projects.
                AND: [
                  { projectId: { in: managedInheritedProjectIds } },
                  { pegawaiId: explicitPegawaiId }
                ]
              }
            : {
                OR: [
                  { createdBy: session.id },
                  {
                    AND: [
                      { projectId: { in: managedInheritedProjectIds } },
                      { pegawaiId: { in: visibleAssigneeIds } }
                    ]
                  }
                ]
              };

          // Add exclusion for PIC tasks if any
          if (taskIdsToExclude.length > 0) {
            // Wrap existing filter with AND to add exclusion
            const wrappedFilter: Prisma.TasklistWhereInput = {
              AND: [
                visibilityFilter,
                { id: { notIn: taskIdsToExclude } }
              ]
            };

            // Merge with existing where clause
            if (qWhere.AND) {
              qWhere.AND = Array.isArray(qWhere.AND)
                ? [...qWhere.AND, wrappedFilter]
                : [qWhere.AND, wrappedFilter];
            } else {
              qWhere.AND = [wrappedFilter];
            }
          } else {
            // No exclusions, just apply visibility filter
            if (qWhere.AND) {
              qWhere.AND = Array.isArray(qWhere.AND)
                ? [...qWhere.AND, visibilityFilter]
                : [qWhere.AND, visibilityFilter];
            } else {
              qWhere.AND = [visibilityFilter];
            }
          }

          console.log(`✅ PM can see: tasks created by them OR assigned to ${subordinateIdList.length} subordinates (excluded ${taskIdsToExclude.length} PIC tasks)`);
        } else {
          console.log(`👁️ User ${session.id} is PIC/Region in SUPPORT/DEV projects - can see all tasks`);
        }
      }
    }

    // Optionally include all statuses: if showAll is set, do not exclude completed past tasks
    const showAll = searchParams.get('showAll');
    if (!showAll) {
      // Exclude completed tasks in the past (status = 'SELESAI' and scheduleAt < today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existingNOT = qWhere.NOT && Array.isArray(qWhere.NOT) ? qWhere.NOT : [];
      qWhere.NOT = [
        ...existingNOT,
        { AND: [{ status: 'SELESAI' }, { scheduleAt: { lt: today } }] }
      ];
    }

    // Sorting mapping
    const orderBy: Prisma.TasklistOrderByWithRelationInput = (() => {
      switch (sortKey) {
        case 'scheduleAt': return { scheduleAt: sortDir };
        case 'proyekNama': return { projectId: sortDir }; // will be enriched later; approximate by projectId
        case 'moduleNama': return { moduleId: sortDir };
        case 'pegawaiNama': return { pegawaiId: sortDir };
        case 'status': return { statusCode: sortDir };
        case 'baVersion': return { baVersion: sortDir };
        default: return { createdAt: 'desc' as const };
      }
    })();

    let page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    let size = Number.isFinite(sizeParam) && sizeParam > 0 && sizeParam <= 100 ? sizeParam : 10;

    console.log('About to count tasks with where clause:', JSON.stringify(qWhere, null, 2));
    console.log('Status filter applied:', statusParam, '-> qWhere.status:', qWhere.status);

    let total: number;
    try {
      total = await prisma.tasklist.count({ where: qWhere });
      console.log('✅ Task count result:', total);
    } catch (countError) {
      console.error('❌ Count query failed:', countError);
      throw new Error(`Count query failed: ${countError instanceof Error ? countError.message : String(countError)}`);
    }

    // When showAll=1 is requested, return all matching tasks (no pagination)
    const unpagedForReport = !!showAll;
    if (unpagedForReport) {
      page = 1;
      size = total; // ensure subsequent branches fetch all
    }

    let rows: Prisma.TasklistGetPayload<Record<string, never>>[] = [];

    // Action-based sort: use SQL to compute action_priority so pagination is correct across all pages.
    // Priority is determined by which action button would appear for the current user:
    //   PM role:         MENUNGGU_REVIEW_PM (where creator is not PIC) → rank 0, rest → rank 1..4
    //   PROGRAMMER role: SEDANG_DIPROSES_USER+startedAt → rank 0, MENUNGGU_PROSES_USER → rank 1, etc.
    const useActionSort = !sortKey || sortKey === '' || sortKey === 'statusCustom' || sortKey === 'statusCustomPM' || sortKey === 'aksi';
    const programmerCustomSort = (session?.role === 'PROGRAMMER' || session?.role === 'ADMIN') && (!sortKey || sortKey === '' || sortKey === 'statusCustom');
    const pmCustomSort = (session?.role === 'PM' || session?.role === 'SUPER_ADMIN') && (!sortKey || sortKey === '' || sortKey === 'statusCustomPM');

    console.log('Sorting logic:', {
      programmerCustomSort,
      pmCustomSort,
      useActionSort,
      sortKey,
      userRole: session?.role,
      unpagedForReport
    });

    // ── Action-priority sort via raw SQL ──────────────────────────────────────
    // For action sort (default / 'aksi' / statusCustom / statusCustomPM), we need to
    // JOIN proyek_team to determine whether the current user is PM in each project,
    // and whether the creator of the task is a PIC.  This cannot be expressed in
    // Prisma's orderBy, so we:
    //   1. Run a lightweight raw SQL query that returns only IDs in the desired order.
    //   2. Fetch the full row data for that page via Prisma findMany({ where: { id: { in: ids } } }).
    //   3. Re-sort the Prisma results to match the SQL order (Prisma doesn't guarantee IN order).
    if (useActionSort && session?.id) {
      const userId = session.id;

      // Build the action_priority CASE expression.
      // For PM role: rank 0 when status = MENUNGGU_REVIEW_PM AND creator is NOT a PIC
      // For PROGRAMMER/ADMIN role: rank 0 when SEDANG_DIPROSES_USER + started_at IS NOT NULL,
      //                             rank 1 when MENUNGGU_PROSES_USER, etc.
      // Secondary sort: scheduleAt ASC within same rank.

      let actionPriorityExpr: string;

      if (session.role === 'PM' || session.role === 'SUPER_ADMIN') {
        // PM/SUPER_ADMIN action priority:
        //   rank 0: Approve/Reject → MENUNGGU_REVIEW_PM, user is PM in project, creator is NOT PIC
        //   rank 1: Kirim Review   → assignee = me, SEDANG_DIPROSES_USER, started_at IS NOT NULL
        //   rank 2: Mulai          → assignee = me, MENUNGGU_PROSES_USER
        //   rank 3: MENUNGGU_REVIEW_PM (visible but not approvable by this user)
        //   rank 4+: rest by status, then scheduleAt
        actionPriorityExpr = `
          CASE
            WHEN t.status = 'MENUNGGU_REVIEW_PM'
              AND EXISTS (
                SELECT 1 FROM proyek_team pt_user
                WHERE pt_user."projectId" = t."projectId"
                  AND pt_user."pegawaiId" = ${userId}
                  AND pt_user.jabatan ILIKE '%PM%'
              )
              AND (
                t."createdBy" IS NULL
                OR t."createdBy" = ${userId}
                OR NOT EXISTS (
                  SELECT 1 FROM proyek_team pt_creator
                  WHERE pt_creator."projectId" = t."projectId"
                    AND pt_creator."pegawaiId" = t."createdBy"
                    AND pt_creator.jabatan ILIKE '%PIC%'
                )
              )
            THEN 0
            WHEN t."pegawaiId" = ${userId}
              AND t.status = 'SEDANG_DIPROSES_USER'
              AND t.started_at IS NOT NULL
            THEN 1
            WHEN t."pegawaiId" = ${userId}
              AND t.status = 'MENUNGGU_PROSES_USER'
            THEN 2
            WHEN t.status = 'MENUNGGU_REVIEW_PM' THEN 3
            WHEN t.status = 'SEDANG_DIPROSES_USER' THEN 4
            WHEN t.status = 'SEDANG_DIPROSES_USER_PAUSED' THEN 5
            WHEN t.status = 'MENUNGGU_PROSES_USER' THEN 6
            WHEN t.status = 'SELESAI' THEN 99
            ELSE 98
          END
        `;
      } else {
        // PROGRAMMER / ADMIN action priority:
        //   rank 0: Kirim Review → assignee = me, SEDANG_DIPROSES_USER, started_at IS NOT NULL
        //   rank 1: Mulai        → assignee = me, MENUNGGU_PROSES_USER
        //   rank 2+: rest by status, then scheduleAt
        actionPriorityExpr = `
          CASE
            WHEN t."pegawaiId" = ${userId}
              AND t.status = 'SEDANG_DIPROSES_USER'
              AND t.started_at IS NOT NULL
            THEN 0
            WHEN t."pegawaiId" = ${userId}
              AND t.status = 'MENUNGGU_PROSES_USER'
            THEN 1
            WHEN t.status = 'SEDANG_DIPROSES_USER' THEN 2
            WHEN t.status = 'SEDANG_DIPROSES_USER_PAUSED' THEN 3
            WHEN t.status = 'MENUNGGU_REVIEW_PM' THEN 4
            WHEN t.status = 'MENUNGGU_PROSES_USER' THEN 5
            WHEN t.status = 'SELESAI' THEN 99
            ELSE 98
          END
        `;
      }

      // We need to translate qWhere into a SQL WHERE clause.
      // The safest approach: use Prisma to get ALL matching IDs (no pagination),
      // then apply the action_priority ordering via raw SQL on those IDs only.
      // This avoids duplicating the complex Prisma WHERE logic in raw SQL.
      const allMatchingIds = await prisma.tasklist.findMany({
        where: qWhere,
        select: { id: true },
      });

      const idList = allMatchingIds.map(r => r.id);
      const computedTotal = idList.length;

      // Update total to the filtered count
      // (total was already computed above via prisma.count, should match)

      if (idList.length === 0) {
        rows = [];
      } else {
        // Use raw SQL to sort the IDs by action_priority then scheduleAt
        const idArray = idList.join(',');
        const sortedIdRows = await prisma.$queryRawUnsafe<{ id: number }[]>(`
          SELECT t.id
          FROM tasklist t
          WHERE t.id IN (${idArray})
          ORDER BY
            ${actionPriorityExpr} ASC,
            t."scheduleAt" ASC
          LIMIT ${size} OFFSET ${(page - 1) * size}
        `);

        const pageIds = sortedIdRows.map(r => Number(r.id));

        if (pageIds.length === 0) {
          rows = [];
        } else {
          // Fetch full rows for this page
          const pageRows = await prisma.tasklist.findMany({
            where: { id: { in: pageIds } },
          });

          // Re-sort to match SQL order (IN clause does not preserve order)
          const idxMap = new Map(pageIds.map((id, i) => [id, i]));
          rows = pageRows.sort((a, b) => (idxMap.get(a.id) ?? 99) - (idxMap.get(b.id) ?? 99));
        }
      }
    } else if (unpagedForReport) {
      rows = await prisma.tasklist.findMany({ where: qWhere, orderBy });
    } else {
      rows = await prisma.tasklist.findMany({ where: qWhere, orderBy, skip: (page - 1) * size, take: size });
    }
    // enrich with names
    const projectIds = Array.from(new Set(rows.map(r => r.projectId)));
    const moduleIds = Array.from(new Set(rows.map(r => r.moduleId)));
    const pegawaiIds = Array.from(new Set(rows.map(r => r.pegawaiId).filter(id => id !== null) as number[]));

    // Also include creator IDs to fetch their jabatan
    const creatorIds = Array.from(new Set(rows.map(r => r.createdBy).filter(id => id !== null) as number[]));
    const allUserIds = Array.from(new Set([...pegawaiIds, ...creatorIds]));

    const [projects, modules, pegawais, proyekTeams, tasklistLogs] = await Promise.all([
      prisma.proyek.findMany({ where: { id: { in: projectIds } } }),
      prisma.proyekModule.findMany({ where: { id: { in: moduleIds } } }),
      prisma.pegawai.findMany({ where: { id: { in: allUserIds } } }),
      prisma.proyekTeam.findMany({
        where: {
          projectId: { in: projectIds },
          pegawaiId: { in: allUserIds } // Include both assignees and creators
        }
      }),
      prisma.tasklistLog.findMany({
        where: {
          taskId: { in: rows.map(r => r.id) },
          action: { in: ['START', 'STATUS_CHANGE'] }
        },
        orderBy: { waktu: 'asc' }
      })
    ]);

    // Map actual duration from logs (START to SELESAI)
    const mapActualDuration = new Map<number, number>();
    const logsByTask = new Map<number, typeof tasklistLogs>();
    
    for (const log of tasklistLogs) {
      if (!logsByTask.has(log.taskId)) {
        logsByTask.set(log.taskId, []);
      }
      logsByTask.get(log.taskId)!.push(log);
    }

    for (const [taskId, logs] of logsByTask.entries()) {
      let durationMinutes = 0;
      const startLog = logs.find(l => l.action === 'START');
      // get the LAST STATUS_CHANGE log with status SELESAI
      const endLog = [...logs].reverse().find(l => l.action === 'STATUS_CHANGE' && l.status === 'SELESAI');
      
      if (startLog && endLog) {
        const diffMs = endLog.waktu.getTime() - startLog.waktu.getTime();
        if (diffMs > 0) {
          durationMinutes = Math.floor(diffMs / (1000 * 60));
        }
      }
      mapActualDuration.set(taskId, durationMinutes);
    }
    const mapP = new Map(projects.map(p => [p.id, p.namaProyek]));
    const mapM = new Map(modules.map(m => [m.id, m.nama]));
    const mapE = new Map(pegawais.map(e => [e.id, e.namaLengkap]));
    const mapRole = new Map(pegawais.map(e => [e.id, e.role]));
    // Map jabatan from ProyekTeam: key = "projectId-pegawaiId"
    const mapJabatan = new Map(proyekTeams.map(pt => [`${pt.projectId}-${pt.pegawaiId}`, pt.jabatan]));
    // Map teamSource from ProyekTeam: key = "projectId-pegawaiId"
    const mapTeamSource = new Map(proyekTeams.map(pt => [`${pt.projectId}-${pt.pegawaiId}`, pt.teamSource]));

    const items = rows.map(r => {
      const sc = r.statusCode ?? statusToCode(r.status);
      const sanitized = sanitizeTasklistData(r);
      const jabatanKey = r.pegawaiId ? `${r.projectId}-${r.pegawaiId}` : null;
      const jabatan = jabatanKey ? mapJabatan.get(jabatanKey) : null;
      const role = r.pegawaiId ? mapRole.get(r.pegawaiId) : null;

      // Get creator's jabatan and teamSource for permission checks
      const creatorJabatanKey = r.createdBy ? `${r.projectId}-${r.createdBy}` : null;
      const creatorJabatan = creatorJabatanKey ? mapJabatan.get(creatorJabatanKey) : null;
      const creatorTeamSource = creatorJabatanKey ? mapTeamSource.get(creatorJabatanKey) : null;

      return {
        ...sanitized,
        statusCode: sc,
        statusText: codeToText(sc),
        proyekNama: mapP.get(r.projectId) || '',
        moduleNama: mapM.get(r.moduleId) || '',
        pegawaiNama: r.pegawaiId ? (mapE.get(r.pegawaiId) || '') : '',
        pegawaiRole: role || 'PROGRAMMER', // fallback to role from Pegawai table
        pegawaiJabatan: jabatan || null, // jabatan from ProyekTeam (PM, Programmer, PIC, etc)
        creatorJabatan: creatorJabatan || null, // creator's jabatan for permission checks
        creatorTeamSource: creatorTeamSource || null, // creator's teamSource for permission checks
        scheduleAt: r.scheduleAt, // Jadwal mulai task
        calculatedDueDate: r.calculatedDueDate, // Due date yang dihitung otomatis
        tasklistType: r.tasklistType, // Tipe task (DEVELOPMENT, BLUEPRINT, MAINTENANCE)
        totalDurationMinutes: r.totalDurationMinutes, // Total durasi dalam menit
        actualDurationMinutes: mapActualDuration.get(r.id) || 0, // Calculated from logs
      };
    });
    return NextResponse.json({ items, total, page, size });
  } catch (e) {
    console.error('GET /api/tasklist error:', e);
    console.error('Error stack:', e instanceof Error ? e.stack : 'No stack trace');
    return NextResponse.json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? (e instanceof Error ? e.message : String(e)) : undefined
    }, { status: 500 });
  }
}

export const GET = withCORS(handleGET);

// POST /api/tasklist
export async function POST(req: Request) {
  // Set timeout for this request to 30 seconds
  const timeoutId = setTimeout(() => {
    console.error('⏰ Task creation timeout after 30 seconds');
  }, 30000);
  const ct = req.headers.get('content-type') || '';
  // derive session for logging
  const cookieHeader = req.headers.get('cookie');
  const session = parseSessionFromCookieHeader(cookieHeader);
  let projectId: number, moduleId: number, pegawaiId: number, scheduleAt: Date, keterangan: string | null, imagePath: string | null = null;
  let statusCode: number | null = null;
  let statusEnum: string | null = null;
  let tasklistType: string = 'DEVELOPMENT';
  let taskComplexity: string = 'MEDIUM';
  let customDurationHours: number | null = null;
  let sourceBacklogId: number | null = null;
  const uploadedFiles: Array<{ fileName: string, originalName: string, filePath: string, fileType: string, fileSize: number }> = [];

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    projectId = Number(form.get('projectId'));
    moduleId = Number(form.get('moduleId'));
    pegawaiId = Number(form.get('pegawaiId'));
    const scheduleAtStr = String(form.get('scheduleAt') || '');
    scheduleAt = new Date(scheduleAtStr);
    const ket = form.get('keterangan');
    keterangan = ket ? String(ket) : null;
    const scStr = form.get('statusCode');
    if (scStr != null) {
      const scNum = Number(scStr);
      if (Number.isFinite(scNum)) statusCode = scNum;
    }
    const stStr = form.get('status');
    if (stStr) statusEnum = String(stStr);
    const ttStr = form.get('tasklistType');
    if (ttStr && ['BLUEPRINT', 'DEVELOPMENT', 'MAINTENANCE'].includes(String(ttStr))) {
      tasklistType = String(ttStr);
    }
    const tcStr = form.get('taskComplexity');
    if (tcStr && ['EASY', 'MEDIUM', 'HARD'].includes(String(tcStr))) {
      taskComplexity = String(tcStr);
    }
    const customDurStr = form.get('customDurationHours');
    if (customDurStr) {
      const durNum = parseFloat(String(customDurStr));
      if (Number.isFinite(durNum) && durNum > 0) {
        customDurationHours = durNum;
      }
    }
    // Handle multiple files
    const files = form.getAll('files') as unknown as File[];
    console.log(`📤 form.getAll('files') returned:`, files?.length || 0, 'items');

    if (files && files.length > 0) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
        console.log(`📁 Creating directory:`, uploadsDir);
        await fs.mkdir(uploadsDir, { recursive: true });
        console.log(`✅ Directory created/exists`);

        for (const file of files) {
          console.log(`📄 Processing file:`, file?.name, typeof file);
          if (file && typeof file === 'object' && 'arrayBuffer' in file) {
            // Validate file before processing
            const validation = validateFile(file);
            if (!validation.isValid) {
              console.error(`❌ File validation failed for ${file.name}:`, validation.error);
              return NextResponse.json({ error: validation.error }, { status: 400 });
            }

            const bytes = Buffer.from(await file.arrayBuffer());
            console.log(`📦 File bytes length:`, bytes.length);
            const ext = (file.name && file.name.includes('.')) ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
            const cleanExt = ext.replace(/[^a-z0-9.]/gi, '').toLowerCase();
            const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${cleanExt}`;
            const fullPath = path.join(uploadsDir, filename);
            console.log(`💾 Saving to:`, fullPath);
            await fs.writeFile(fullPath, bytes);
            console.log(`✅ File saved successfully`);

            // Verify file was written successfully
            const stats = await fs.stat(fullPath);
            if (stats.size === 0) {
              throw new Error('File was not written correctly');
            }

            uploadedFiles.push({
              fileName: filename,
              originalName: file.name || filename,
              filePath: `/api/uploads/tasklist/${filename}`,
              fileType: file.type || 'application/octet-stream',
              fileSize: stats.size
            });

            // Keep first file as legacy imagePath for backward compatibility (if it's an image)
            if (!imagePath && file.type.startsWith('image/')) {
              imagePath = `/api/uploads/tasklist/${filename}`;
            }
          }
        }
      } catch (e) {
        console.error('Failed saving uploads', e);
        return NextResponse.json({ error: 'Gagal menyimpan file' }, { status: 500 });
      }
    }
  } else {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    projectId = Number(body?.projectId);
    moduleId = Number(body?.moduleId);
    pegawaiId = Number(body?.pegawaiId);
    const scheduleAtStr = String(body?.scheduleAt || '');
    scheduleAt = new Date(scheduleAtStr);
    keterangan = body?.keterangan ? String(body.keterangan) : null;
    if (body?.statusCode != null) {
      const scNum = Number(body.statusCode);
      if (Number.isFinite(scNum)) statusCode = scNum;
    }
    if (body?.status) statusEnum = String(body.status);
    if (body?.tasklistType && ['BLUEPRINT', 'DEVELOPMENT', 'MAINTENANCE'].includes(String(body.tasklistType))) {
      tasklistType = String(body.tasklistType);
    }
    // Parse sourceBacklogId if provided
    if (body?.sourceBacklogId) {
      const sbId = Number(body.sourceBacklogId);
      if (Number.isFinite(sbId)) sourceBacklogId = sbId;
    }
  }
  if (!Number.isFinite(projectId) || !Number.isFinite(moduleId) || !Number.isFinite(pegawaiId) || isNaN(scheduleAt.getTime())) {
    return NextResponse.json({ error: 'projectId, moduleId, pegawaiId, scheduleAt required' }, { status: 400 });
  }
  try {
    console.log('🚀 Starting task creation process...');
    const startTime = Date.now();

    // ensure module belongs to project and is a leaf
    console.log('📋 Validating module...');
    const mod = await prisma.proyekModule.findUnique({ where: { id: moduleId } });
    if (!mod || mod.projectId !== projectId) return NextResponse.json({ error: 'Invalid module for project' }, { status: 400 });
    if (!mod.isLeaf) {
      // double-check via children existence if needed
      const childCount = await prisma.proyekModule.count({ where: { parentId: moduleId } });
      if (childCount > 0) return NextResponse.json({ error: 'Module must be a leaf' }, { status: 400 });
    }

    // PERMISSION CHECK: Allow PM and PIC to create tasks
    // Check if user is PM or PIC in this project (based on ProyekTeam.jabatan)
    if (session?.id) {
      // First, check if user is PM or PIC in this specific project
      const userInProject = await prisma.proyekTeam.findFirst({
        where: {
          projectId,
          pegawaiId: session.id
        }
      });

      if (userInProject) {
        const jabatanUpper = userInProject.jabatan.toUpperCase();

        // If user is PM in this project, allow task creation
        if (jabatanUpper.includes('PM')) {
          console.log(`✅ User ${session.id} is PM in project ${projectId}, allowing task creation`);
        }
        // If user is PIC in this project, allow task creation
        else if (jabatanUpper.includes('PIC')) {
          console.log(`✅ User ${session.id} is PIC in project ${projectId}, allowing task creation`);
        }
        // If user has other jabatan (e.g., Programmer), check if they have PM/ADMIN role
        else if (session.role !== 'PM' && session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
          console.log(`❌ User ${session.id} is ${userInProject.jabatan} in project ${projectId}, not allowed to create tasks`);
          return NextResponse.json({
            error: 'Anda tidak memiliki permission untuk membuat task di proyek ini'
          }, { status: 403 });
        }
      } else {
        // User not in project team, check if they have PM/ADMIN/SUPER_ADMIN role
        if (session.role !== 'PM' && session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
          console.log(`❌ User ${session.id} not in project ${projectId} team and not PM/ADMIN`);
          return NextResponse.json({
            error: 'Anda bukan anggota tim proyek ini'
          }, { status: 403 });
        }
      }
    }

    // ensure pegawai is in the project's team OR hierarchy (for SUPPORT/DEV projects with region)
    const teamMember = await prisma.proyekTeam.findFirst({ where: { projectId, pegawaiId } });

    if (!teamMember) {
      // Check if this is a SUPPORT/DEV project with region-based team (check via ProyekTeam.teamSource)
      const project = await prisma.proyek.findUnique({ where: { id: projectId }, select: { type: true } });

      // Check if project has region team members
      const hasRegionTeam = await prisma.proyekTeam.findFirst({
        where: {
          projectId,
          teamSource: 'region'
        }
      });

      if ((project?.type === 'SUPPORT' || (project?.type === 'DEVELOPMENT' && hasRegionTeam)) && session?.id) {
        // Check if assigned user is subordinate of task creator in hierarchy
        const hierarchy = await prisma.teamHierarchy.findFirst({
          where: {
            projectId,
            managerId: session.id,
            memberId: pegawaiId,
            isActive: true,
          },
        });

        if (!hierarchy) {
          console.log(`❌ User ${pegawaiId} not in team or hierarchy for PM ${session.id}`);
          return NextResponse.json({ error: 'Pegawai bukan anggota tim proyek' }, { status: 400 });
        }

        console.log(`✅ User ${pegawaiId} found in hierarchy as subordinate of PM ${session.id}`);
      } else {
        return NextResponse.json({ error: 'Pegawai bukan anggota tim proyek' }, { status: 400 });
      }
    }
    // Build kode using module's hierarchical kode when available (e.g., 01.02.03)
    const proyek = await prisma.proyek.findUnique({ where: { id: projectId } });
    if (!proyek) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 400 });
    const kode = await generateTasklistKode(prisma);
    const finalCode = statusCode != null ? statusCode : statusToCode(statusEnum);
    const finalStatus = statusEnum ? statusEnum : codeToStatus(finalCode);

    // Auto-determine complexity from custom duration if provided
    if (customDurationHours) {
      taskComplexity = await determineComplexityFromHours(customDurationHours);
      console.log(`Auto-determined complexity from ${customDurationHours} hours: ${taskComplexity}`);
    }

    // Calculate SLA deadlines based on task complexity
    console.log('⏱️ Calculating SLA deadlines...');
    const slaDeadlines = await calculateSlaDeadlines(taskComplexity as 'EASY' | 'MEDIUM' | 'HARD', scheduleAt);

    // Calculate due date using smart scheduling (JWT + break time)
    console.log('📅 Calculating due date with smart scheduling...');
    let calculatedDueDate: Date | null;
    let durationMinutes = 0;

    // Determine duration in minutes (used for both scheduling and workload validation)
    if (customDurationHours) {
      durationMinutes = Math.round(customDurationHours * 60);
      console.log(`Using custom duration: ${customDurationHours} hours = ${durationMinutes} minutes`);
    } else {
      // Get default duration from TaskComplexity master table
      const complexityMaster = await prisma.taskComplexity.findUnique({
        where: { complexity: taskComplexity as SlaType }
      });

      if (complexityMaster) {
        durationMinutes = Math.round(complexityMaster.hours * 60);
        console.log(`Using complexity-based duration from master: ${taskComplexity} = ${complexityMaster.hours} hours = ${durationMinutes} minutes`);
      } else {
        // Fallback if complexity not found in master
        console.warn(`⚠️ Complexity ${taskComplexity} not found in TaskComplexity master, using default 8 hours`);
        durationMinutes = 8 * 60;
      }
    }

    try {
      // Calculate schedule using JWT working hours + break time
      const scheduleResult = await calculateTaskSchedule(pegawaiId, scheduleAt, durationMinutes);
      calculatedDueDate = scheduleResult.endTime;

      console.log(`✅ Smart scheduling result:`);
      console.log(`   Start: ${scheduleResult.startTime.toISOString()}`);
      console.log(`   End: ${scheduleResult.endTime.toISOString()}`);
      console.log(`   Working days: ${scheduleResult.workingDays}`);
      console.log(`   Break time excluded: ${scheduleResult.breakTimeExcluded} minutes`);
      console.log(`   Schedule breakdown:`, scheduleResult.schedule);
    } catch (scheduleError) {
      console.warn('⚠️ Smart scheduling failed, falling back to standard calculation:', scheduleError);

      // Fallback to standard calculation
      if (customDurationHours) {
        calculatedDueDate = addWorkingHours(scheduleAt, customDurationHours, DEFAULT_CONFIG);
        console.log(`Fallback - Using custom duration: ${customDurationHours} hours -> Due: ${calculatedDueDate.toISOString()}`);
      } else {
        calculatedDueDate = await setTaskDueDateOnCreate(scheduleAt, taskComplexity as 'EASY' | 'MEDIUM' | 'HARD');
        console.log(`Fallback - Using complexity-based duration: ${taskComplexity}`);
      }
    }

    console.log(`⚡ Pre-creation processing took ${Date.now() - startTime}ms`);

    // Validate workload capacity before creating task
    console.log('🔍 Validating workload capacity...');
    const workloadValidation = await validateWorkload(
      pegawaiId,
      scheduleAt,
      durationMinutes,
      100 // 100% capacity threshold - can be adjusted or made configurable
    );

    if (!workloadValidation.valid) {
      console.log(`❌ Workload validation failed: ${workloadValidation.message}`);
      return NextResponse.json({
        error: 'WORKLOAD_EXCEEDED',
        message: workloadValidation.message,
        details: workloadValidation.details
      }, { status: 400 });
    }

    console.log(`✅ Workload validation passed: ${workloadValidation.message}`);
    if (workloadValidation.details) {
      console.log(`   Utilization: ${workloadValidation.details.utilizationPercentage.toFixed(1)}%`);
      console.log(`   Existing tasks: ${workloadValidation.details.existingTaskCodes.join(', ') || 'none'}`);
    }

    // Resolve version from baVersion on the module itself (bacara relation sudah dihapus)
    let taskVersion = '1.0.0';
    const moduleWithVersion = await prisma.proyekModule.findUnique({
      where: { id: moduleId },
      select: { baVersion: true },
    });
    if (moduleWithVersion?.baVersion && moduleWithVersion.baVersion !== '0.0.1') {
      taskVersion = moduleWithVersion.baVersion;
      console.log(`✅ Using baVersion for module ${moduleId}: ${taskVersion}`);
    } else {
      console.log(`⚠️ No baVersion found for module ${moduleId}, using default: ${taskVersion}`);
    }

    const created = await prisma.tasklist.create({
      data: {
        projectId,
        moduleId,
        pegawaiId,
        createdBy: session?.id || 0,
        scheduleAt,
        keterangan: keterangan || null,
        imagePath: imagePath || null,
        kode,
        statusCode: finalCode,
        status: finalStatus as TaskStatus,
        tasklistType: tasklistType as TasklistType,
        taskComplexity: taskComplexity as SlaType,
        depId: session?.departemenId ?? null,
        customDurationHours: customDurationHours,
        assigneeStartTaskDeadline: slaDeadlines.assigneeStartTaskDeadline,
        assigneeWorkDeadline: slaDeadlines.assigneeWorkDeadline,
        pmReviewDeadline: slaDeadlines.pmReviewDeadline,
        calculatedDueDate: calculatedDueDate,
        version: taskVersion,
        baVersion: taskVersion,
        sourceBacklogId: sourceBacklogId,
      }
    });

    // Note: Module version is NOT updated here anymore
    // Version increments only when BA is approved

    // Save multiple files to tasklist_image table (keeping table name for backward compatibility)
    console.log(`📎 uploadedFiles.length: ${uploadedFiles.length}`);
    if (uploadedFiles.length > 0) {
      try {
        console.log(`📎 Ensuring file table exists...`);
        await ensureImageTable();
        console.log(`📎 Saving ${uploadedFiles.length} files...`);
        for (const file of uploadedFiles) {
          console.log(`📎 Inserting file:`, file.fileName);
          await prisma.$executeRaw`
            INSERT INTO public.tasklist_image ("taskId", "fileName", "originalName", "filePath", "fileType", "fileSize", "uploadedBy", "uploadedAt")
            VALUES (${created.id}, ${file.fileName}, ${file.originalName}, ${file.filePath}, ${file.fileType}, ${file.fileSize}, ${session?.id || null}, NOW())
          `;
        }
        console.log(`✅ Saved ${uploadedFiles.length} files to database for task ${created.id}`);
      } catch (e) {
        console.error('❌ Failed to save files to database:', e);
      }
    } else {
      console.log(`⚠️ No files to save (uploadedFiles is empty)`);
    }

    // Log creation with assignment information
    try {
      await ensureLogTable();

      // Get creator and assignee names for better log message
      const [creator, assignee] = await Promise.all([
        session?.id ? prisma.pegawai.findUnique({ where: { id: session.id }, select: { namaLengkap: true } }) : null,
        prisma.pegawai.findUnique({ where: { id: pegawaiId }, select: { namaLengkap: true } })
      ]);

      const creatorName = creator?.namaLengkap || 'System';
      const assigneeName = assignee?.namaLengkap || 'Unknown';

      // Create detailed log message
      const logMessage = `${creatorName} assign to ${assigneeName}`;

      console.log(`📝 [CREATE LOG] Inserting creation log for task ${created.id}`);
      console.log(`📝 [CREATE LOG] Message: ${logMessage}`);
      console.log(`📝 [CREATE LOG] Status: ${created.status}`);

      const nowTs = new Date();
      await prisma.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action)
        VALUES (${created.id}, (${nowTs}::timestamptz AT TIME ZONE 'Asia/Jakarta')::timestamp, ${session?.id || 0}, ${logMessage}, ${created.status}::"TaskStatus", 'CREATE')`;

      console.log(`✅ [CREATE LOG] Log inserted successfully for task ${created.id}`);

      // Also log to TaskActivity for timeline
      await prisma.taskActivity.create({
        data: {
          taskId: created.id,
          userId: session?.id || 0,
          action: 'TASK_CREATED',
          fromStatus: null,
          toStatus: created.status,
          note: `Task created and assigned to ${assigneeName}`,
          metadata: {
            projectId,
            moduleId,
            assignedTo: pegawaiId,
            taskComplexity,
            tasklistType,
            scheduleAt: scheduleAt.toISOString()
          }
        }
      });

      console.log(`✅ [CREATE ACTIVITY] TaskActivity log created for task ${created.id}`);
    } catch (e) {
      console.error('❌ TasklistLog insert (create) failed', e);
    }

    // Send Pusher realtime notification to assignee
    try {
      console.log('🔔 Sending Pusher notification to assignee...');
      const creatorName = session?.namaLengkap || 'System';
      const template = notificationTemplates['task.assigned'](kode, proyek.namaProyek, creatorName);

      await sendTaskNotification({
        type: 'task.assigned',
        taskId: created.id,
        taskCode: kode,
        projectId: projectId,
        projectName: proyek.namaProyek,
        fromUserId: session?.id,
        fromUserName: creatorName,
        toUserId: pegawaiId,
        title: template.title,
        message: template.message,
        priority: template.priority,
        data: {
          taskComplexity,
          scheduleAt: scheduleAt.toISOString(),
          deadline: slaDeadlines.assigneeStartTaskDeadline?.toISOString(),
        },
      });

      console.log('✅ Pusher notification sent successfully');

      // Note: We intentionally do NOT send a 'task.created' notification back to the creator (PM).
      // The PM created the task themselves — they don't need a bell notification for their own action.
      // The tasklist page reloads via reloadWithCurrentParams() after creation, which is sufficient.
    } catch (notifError) {
      console.error('❌ Pusher notification failed (non-fatal):', notifError);
    }

    // Send WhatsApp notification to assignee (non-blocking)
    try {
      console.log('📱 Sending WhatsApp notification to assignee...');

      // Get assignee details with phone number
      const assignee = await prisma.pegawai.findUnique({
        where: { id: pegawaiId },
        select: { namaLengkap: true, noHp: true }
      });

      if (assignee?.noHp) {
        // Get project and module names for notification
        const [project, module] = await Promise.all([
          prisma.proyek.findUnique({ where: { id: projectId }, select: { namaProyek: true } }),
          prisma.proyekModule.findUnique({ where: { id: moduleId }, select: { nama: true } })
        ]);

        const cleanPhone = cleanPhoneNumber(assignee.noHp);
        if (cleanPhone) {
          const notificationMessage = formatTaskAssignmentMessage({
            id: created.id,
            kode: created.kode,
            proyekNama: project?.namaProyek || 'Unknown Project',
            moduleNama: module?.nama || 'Unknown Module',
            pegawaiNama: assignee.namaLengkap || 'Unknown User',
            taskComplexity: taskComplexity,
            assigneeStartTaskDeadline: slaDeadlines.assigneeStartTaskDeadline,
            scheduleAt: scheduleAt,
            keterangan: keterangan || undefined,
            calculatedDueDate: calculatedDueDate || undefined
          });

          // Send notification (non-blocking - don't wait for result)
          sendWhatsAppMessage({
            to: cleanPhone,
            message: notificationMessage,
            taskId: created.id,
            notificationType: 'task_assigned'
          }).then(result => {
            if (result.success) {
              console.log(`✅ WhatsApp notification sent to ${assignee.namaLengkap} (${cleanPhone})`);
            } else {
              console.error(`❌ WhatsApp notification failed for ${assignee.namaLengkap}:`, result.error);
            }
          }).catch(error => {
            console.error('WhatsApp notification error:', error);
          });
        } else {
          console.log(`⚠️ Invalid phone number for ${assignee.namaLengkap}: ${assignee.noHp}`);
        }
      } else {
        console.log(`⚠️ No phone number found for assignee ID ${pegawaiId}`);
      }
    } catch (notificationError) {
      console.error('WhatsApp notification setup failed (non-fatal):', notificationError);
    }

    console.log(`✅ Task creation completed in ${Date.now() - startTime}ms`);
    clearTimeout(timeoutId);
    return NextResponse.json({
      item: created,
      uploadedFiles: uploadedFiles
    });
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('❌ POST /api/tasklist error', e);
    console.error('Error stack:', e instanceof Error ? e.stack : 'No stack trace');

    // Check if it's a timeout or database connection error
    const errorMessage = e instanceof Error ? e.message : String(e);
    if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      return NextResponse.json({
        error: 'Database connection timeout. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }, { status: 504 });
    }

    return NextResponse.json({
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}
