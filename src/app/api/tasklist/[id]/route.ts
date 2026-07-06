import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader, parseSessionFromRequest } from '@/lib/auth';
import { setTaskDueDateOnCreate } from '@/lib/taskDueDateCalculator';
import { determineComplexityFromHours } from '@/lib/determineComplexityFromHours';
import { sendWhatsAppMessage, formatPMReviewMessage, cleanPhoneNumber } from '@/lib/whatsappService';
import { sendTaskNotification, notificationTemplates, notifyCreatorAndPM, logTaskActivity } from '@/lib/notificationHelper';
import { Prisma, TaskStatus } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { generateTasklistKode } from '@/lib/generateKode';
import { validateFile } from '@/lib/fileUploadConfig';
import { addWorkingHours, DEFAULT_CONFIG } from '@/lib/workingHoursCalculator';
import { calculateTaskSchedule } from '@/lib/smartScheduling';
import { validateProgrammerActionTime, createWorkingHoursErrorResponse } from '@/lib/taskValidation';
export const runtime = 'nodejs';

// Parse date string safely without timezone conversion
function parseDateWithoutTimezone(dateStr: string): Date {
  try {
    console.log('📅 Parsing date string:', dateStr);

    const trimmed = dateStr.trim();

    // Check if it's an ISO string (contains 'T' and 'Z')
    if (trimmed.includes('T')) {
      // ISO format: "2026-01-06T07:20:00.000Z"
      // Parse as UTC but treat as local time
      const date = new Date(trimmed);

      // Extract UTC components
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();

      // Create new date with local timezone using UTC components
      const localDate = new Date(year, month, day, hours, minutes, seconds);
      console.log('✅ Parsed ISO date as local:', localDate.toISOString(), '→ Local:', localDate.toString());
      return localDate;
    }

    // Format: "YYYY-MM-DD HH:mm"
    const [datePart, timePart] = trimmed.split(' ');

    if (!datePart) {
      console.error('❌ No date part found in:', dateStr);
      return new Date(dateStr); // Fallback to default parsing
    }

    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = (timePart || '00:00').split(':').map(Number);

    // Validate parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('❌ Invalid date components:', { year, month, day });
      return new Date(dateStr); // Fallback to default parsing
    }

    const parsed = new Date(year, month - 1, day, hours || 0, minutes || 0);
    console.log('✅ Parsed date:', parsed.toISOString());
    return parsed;
  } catch (error) {
    console.error('❌ Date parsing error:', error);
    return new Date(dateStr); // Fallback to default parsing
  }
}

// Handle NULL values in old tasklist data for backward compatibility
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
  } catch (e) {
    console.error('ensureLogTable failed (non-fatal)', e);
  }
}

// Check task permissions for SUPPORT projects
async function checkTaskPermission(
  taskId: number,
  userId: number | undefined,
  action: 'view' | 'edit' | 'delete'
): Promise<{ allowed: boolean; reason?: string }> {
  if (!userId) return { allowed: false, reason: 'User not authenticated' };

  const task = await prisma.tasklist.findUnique({
    where: { id: taskId },
  });

  if (!task) return { allowed: false, reason: 'Task not found' };

  // Fetch project separately
  const project = await prisma.proyek.findUnique({
    where: { id: task.projectId },
    select: { type: true, id: true },
  });

  // Check if project has region team (for DEV projects with region support)
  const hasRegionTeam = await prisma.proyekTeam.findFirst({
    where: {
      projectId: task.projectId,
      teamSource: 'region'
    }
  });

  // Non-SUPPORT/DEV projects (or DEV without region): allow (existing RBAC handles this)
  if (project?.type !== 'SUPPORT' && !(project?.type === 'DEVELOPMENT' && hasRegionTeam)) {
    return { allowed: true };
  }

  // SUPPORT/DEV projects with region: apply visibility rules
  const isCreator = task.createdBy === userId;
  const isAssignee = task.pegawaiId === userId;

  // Legacy tasks (createdBy = NULL): allow everyone
  if (!task.createdBy) {
    console.log(`📜 Task ${taskId} is legacy (createdBy=NULL), allowing access`);
    return { allowed: true };
  }

  // Get user team info
  const userTeamEntry = await prisma.proyekTeam.findFirst({
    where: {
      projectId: project.id,
      pegawaiId: userId,
    },
  });

  // Get creator team info
  const creatorTeamEntry = await prisma.proyekTeam.findFirst({
    where: {
      projectId: project.id,
      pegawaiId: task.createdBy,
    },
  });

  // Get assignee team info
  const assigneeTeamEntry = await prisma.proyekTeam.findFirst({
    where: {
      projectId: project.id,
      pegawaiId: task.pegawaiId,
    },
  });

  console.log(`[Permission Check] Team entries:`, {
    userId,
    taskId,
    action,
    user: {
      id: userId,
      teamSource: userTeamEntry?.teamSource,
      jabatan: userTeamEntry?.jabatan,
    },
    creator: {
      id: task.createdBy,
      teamSource: creatorTeamEntry?.teamSource,
      jabatan: creatorTeamEntry?.jabatan,
    },
    assignee: {
      id: task.pegawaiId,
      teamSource: assigneeTeamEntry?.teamSource,
      jabatan: assigneeTeamEntry?.jabatan,
    }
  });

  // Determine roles
  const userIsPIC = userTeamEntry && userTeamEntry.teamSource === 'region' &&
    userTeamEntry.jabatan && userTeamEntry.jabatan.toUpperCase().includes('PIC');

  const userIsPM = userTeamEntry && userTeamEntry.teamSource === 'inherited' &&
    userTeamEntry.jabatan && userTeamEntry.jabatan.toUpperCase().includes('PM');

  const creatorIsPIC = creatorTeamEntry && creatorTeamEntry.teamSource === 'region' &&
    creatorTeamEntry.jabatan && creatorTeamEntry.jabatan.toUpperCase().includes('PIC');

  const creatorIsPM = creatorTeamEntry && creatorTeamEntry.teamSource === 'inherited' &&
    creatorTeamEntry.jabatan && creatorTeamEntry.jabatan.toUpperCase().includes('PM');

  const assigneeIsInherited = assigneeTeamEntry && assigneeTeamEntry.teamSource === 'inherited';
  const assigneeIsRegion = assigneeTeamEntry && assigneeTeamEntry.teamSource === 'region';

  console.log(`[Permission Check] Roles:`, {
    userIsPIC,
    userIsPM,
    creatorIsPIC,
    creatorIsPM,
    assigneeIsInherited,
    assigneeIsRegion,
    isCreator,
    isAssignee,
  });

  // RULE 1 (PRIORITY): Creator or assignee always has full access
  if (isCreator || isAssignee) {
    console.log(`✅ User ${userId} is ${isCreator ? 'creator' : 'assignee'} of task ${taskId} - FULL ACCESS`);
    return { allowed: true };
  }

  // RULE 2: PIC (region) creates task for region programmer
  // PM (inherited) should NOT be able to see this task
  if (creatorIsPIC && assigneeIsRegion) {
    if (userIsPM) {
      console.log(`❌ PM ${userId} cannot access task ${taskId} created by PIC for region programmer`);
      return { allowed: false, reason: 'PM cannot access PIC region tasks' };
    }
  }

  // RULE 3: PM (inherited) creates task for inherited programmer
  // PIC (region) can VIEW but NOT EDIT
  if (creatorIsPM && assigneeIsInherited) {
    if (userIsPIC) {
      if (action === 'view') {
        console.log(`👁️ PIC ${userId} viewing PM task ${taskId} (read-only)`);
        return { allowed: true };
      }
      console.log(`❌ PIC ${userId} cannot ${action} PM task ${taskId} - under PM1 management`);
      return { allowed: false, reason: 'PIC cannot modify tasks under PM management' };
    }
  }

  // RULE 4: PIC creates task for PM
  // PM can view/edit as assignee (already handled by RULE 1)
  // But PM cannot approve/reject (handled in status change logic)

  // RULE 5: Default - allow view for PIC/PM hierarchy
  if (userIsPIC || userIsPM) {
    if (action === 'view') {
      console.log(`👁️ PIC/PM ${userId} viewing task ${taskId} (read-only)`);
      return { allowed: true };
    }
    console.log(`❌ PIC/PM ${userId} cannot ${action} task ${taskId}`);
    return { allowed: false, reason: 'You do not have permission to modify this task' };
  }

  // Default: deny for other users
  console.log(`❌ User ${userId} denied access to task ${taskId}`);
  return { allowed: false, reason: 'You do not have permission to access this task' };
}

// Notify external CRM when a CRM-linked task is approved (done)
async function notifyCrmDone(idCrm: string | null | undefined) {
  try {
    const id = (idCrm ?? '').toString().trim();
    if (!id) return;
    const url = process.env.CRM_API_URL;
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'done', id_tasklist: id, note: 'Sudah Selesai' }),
    });
  } catch (e) {
    console.error('CRM done notify failed', e);
  }
}

// Notify external CRM when a CRM-linked task is started (clock in)
async function notifyCrmClockIn(idCrm: string | null | undefined) {
  try {
    const id = (idCrm ?? '').toString().trim();
    if (!id) return;
    const url = process.env.CRM_API_URL;
    if (!url) return;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clock', id_tasklist: id, clock_action: 'in' }),
    });
  } catch (e) {
    console.error('CRM clock-in notify failed', e);
  }
}

// Notify PM when task is sent for review
// Cache to prevent duplicate notifications within short time window
const pmNotificationCache = new Map<number, number>();

async function notifyPMForReview(task: {
  id: number;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  kode: string;
  keterangan?: string | null;
  taskComplexity?: string | null;
  createdBy?: number | null;
}) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔔 [PM Review WA] Starting notification for task ${task.kode} (ID: ${task.id})`);
    console.log(`📋 [PM Review WA] Task info:`, {
      taskId: task.id,
      taskCode: task.kode,
      projectId: task.projectId,
      createdBy: task.createdBy,
      assignee: task.pegawaiId
    });
    
    // Prevent duplicate notifications for the same task within 5 seconds
    const now = Date.now();
    const lastNotified = pmNotificationCache.get(task.id);
    if (lastNotified && (now - lastNotified) < 5000) {
      console.log(`⚠️ [PM Review WA] BLOCKED BY CACHE - Last sent ${Math.floor((now - lastNotified) / 1000)}s ago`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }
    pmNotificationCache.set(task.id, now);

    // Cleanup old entries (older than 10 seconds)
    for (const [taskId, timestamp] of pmNotificationCache.entries()) {
      if (now - timestamp > 10000) {
        pmNotificationCache.delete(taskId);
      }
    }
    
    // Get task creator (PM/SUPER_ADMIN who created the task) for WhatsApp notification
    let creatorPegawai = null;
    if (task.createdBy) {
      creatorPegawai = await prisma.pegawai.findUnique({
        where: { id: task.createdBy },
        select: { id: true, namaLengkap: true, noHp: true }
      });
      console.log(`👤 [PM Review WA] Task creator: ${creatorPegawai?.namaLengkap} (ID: ${task.createdBy}, HP: ${creatorPegawai?.noHp ? 'YES' : 'NO'})`);
    } else {
      console.log(`⚠️ [PM Review WA] No createdBy field (legacy task)`);
    }

    // Fallback: Find PM for this project if no creator or creator has no phone
    if (!creatorPegawai || !creatorPegawai.noHp) {
      console.log(`🔍 [PM Review WA] Fallback: Looking for first PM in project ${task.projectId}...`);
      const pmTeam = await prisma.proyekTeam.findFirst({
        where: {
          projectId: task.projectId,
          jabatan: { contains: 'pm' }
        },
        orderBy: { id: 'asc' }
      });

      if (!pmTeam) {
        console.log(`❌ [PM Review WA] No PM found in project ${task.projectId} - ABORTING`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return;
      }

      creatorPegawai = await prisma.pegawai.findUnique({
        where: { id: pmTeam.pegawaiId },
        select: { id: true, namaLengkap: true, noHp: true }
      });
      console.log(`👤 [PM Review WA] Fallback PM: ${creatorPegawai?.namaLengkap} (ID: ${pmTeam.pegawaiId}, HP: ${creatorPegawai?.noHp ? 'YES' : 'NO'})`);
    }

    if (!creatorPegawai || !creatorPegawai.noHp) {
      console.log(`❌ [PM Review WA] No valid recipient with phone number - ABORTING`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    console.log(`✅ [PM Review WA] Recipient confirmed: ${creatorPegawai.namaLengkap} (${creatorPegawai.noHp})`);
    console.log(`📤 [PM Review WA] Preparing to send WhatsApp to: ${creatorPegawai.noHp}`);

    // Get project, module, assignee details
    const [proyek, modul, assignee] = await Promise.all([
      prisma.proyek.findUnique({ where: { id: task.projectId } }),
      prisma.proyekModule.findUnique({ where: { id: task.moduleId } }),
      prisma.pegawai.findUnique({ where: { id: task.pegawaiId } })
    ]);

    if (!proyek || !modul || !assignee) {
      console.log('[PM Review] Missing project, module, or assignee data');
      return;
    }

    // Format and send WhatsApp message
    const message = formatPMReviewMessage({
      id: task.id,
      kode: task.kode,
      proyekNama: proyek.namaProyek,
      moduleNama: modul.nama,
      pegawaiNama: assignee.namaLengkap,
      pmNama: creatorPegawai.namaLengkap,
      taskComplexity: task.taskComplexity || 'MEDIUM',
      keterangan: task.keterangan || undefined
    });

    await sendWhatsAppMessage({
      to: creatorPegawai.noHp,
      message,
      taskId: task.id,
      notificationType: 'task_review'
    });

    console.log(`✅ [PM Review WA] WhatsApp sent successfully to: ${creatorPegawai.namaLengkap} (${creatorPegawai.noHp})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Send Pusher notification to task creator (PM/SUPER_ADMIN who created the task)
    try {
      if (task.createdBy && task.createdBy !== task.pegawaiId) {
        console.log(`🔍 [PM Review] Sending notification to task creator (ID: ${task.createdBy})`);

        const template = notificationTemplates['task.submitted'](task.kode, proyek.namaProyek, assignee.namaLengkap);

        await sendTaskNotification({
          type: 'task.submitted',
          taskId: task.id,
          taskCode: task.kode,
          projectId: task.projectId,
          projectName: proyek.namaProyek,
          fromUserId: task.pegawaiId,
          fromUserName: assignee.namaLengkap,
          toUserId: task.createdBy,
          title: template.title,
          message: template.message,
          priority: template.priority,
        });
        console.log(`✅ [PM Review] Pusher notification sent to task creator (ID: ${task.createdBy})`);
      } else {
        console.log(`⚠️ [PM Review] No task creator found or creator is the assignee`);
      }
    } catch (pusherError) {
      console.error('[PM Review] Failed to send Pusher notification:', pusherError);
    }
  } catch (error) {
    console.error('[PM Review] Failed to send WhatsApp notification:', error);
    // Don't throw error to avoid breaking the main task flow
  }
}

// Auto-create UAT test item when development task is completed
async function createUATFromCompletedTask(task: {
  id: number;
  projectId: number;
  moduleId: number;
  pegawaiId: number;
  kode: string;
  keterangan?: string | null;
}) {
  try {
    // Generate UAT code based on task code
    const uatKode = `UAT-${task.kode}`;

    // Check if UAT already exists for this task to avoid duplicates
    const existingUAT = await prisma.uatTest.findFirst({
      where: { kode: uatKode }
    });

    if (existingUAT) {
      console.log(`UAT already exists for task: ${task.kode}`);
      return;
    }

    // Create UAT test item
    await prisma.uatTest.create({
      data: {
        namaFitur: task.keterangan || `UAT for ${task.kode}`,
        kode: uatKode,
        projectId: task.projectId,
        moduleId: task.moduleId,
        testerId: task.pegawaiId, // Assign to the same person who completed the task
        tanggalTest: new Date(), // Set to current date
        status: 'Pending',
        deskripsi: `Auto-generated UAT test for completed development task: ${task.kode}`,
      }
    });

    console.log(`UAT test item created: ${uatKode} for completed task: ${task.kode}`);
  } catch (error) {
    console.error('Error creating UAT from completed task:', error);
    // Don't throw error to avoid breaking the main task completion flow
  }
}

// GET /api/tasklist/[id]
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  
  // Get session to determine available actions
  const cookieHeader = req.headers.get('cookie');
  const session = parseSessionFromCookieHeader(cookieHeader);
  
  try {
    // First get the task
    const item = await prisma.tasklist.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Then fetch related data separately
    const [proyek, modul, pegawai] = await Promise.all([
      prisma.proyek.findUnique({ where: { id: item.projectId } }),
      prisma.proyekModule.findUnique({ where: { id: item.moduleId } }),
      item.pegawaiId ? prisma.pegawai.findUnique({ where: { id: item.pegawaiId } }) : null
    ]);

    // Calculate available actions based on user role and task status
    let availableActions: string[] = [];
    
    console.log('🔍 [GET /api/tasklist/[id]] Calculating availableActions:', {
      taskId: id,
      status: item.status,
      sessionId: session?.id,
      sessionRole: session?.role,
      pegawaiId: item.pegawaiId,
      createdBy: item.createdBy
    });
    
    if (session) {
      const isAssignee = item.pegawaiId === session.id;
      const isCreator = item.createdBy === session.id;
      
      // Check if user is PM
      let isPM = session.role === 'PM' || session.role === 'SUPER_ADMIN';
      if (!isPM) {
        const userTeam = await prisma.proyekTeam.findFirst({
          where: {
            projectId: item.projectId,
            pegawaiId: session.id,
          },
        });
        if (userTeam && userTeam.jabatan && userTeam.jabatan.toUpperCase().includes('PM')) {
          isPM = true;
        }
      }
      
      const status = item.status;
      
      console.log('🔍 [GET /api/tasklist/[id]] User roles:', {
        isAssignee,
        isCreator,
        isPM,
        status
      });
      
      // Assignee actions
      if (isAssignee) {
        if (status === 'MENUNGGU_PROSES_USER') {
          availableActions.push('start');
        } else if (status === 'SEDANG_DIPROSES_USER') {
          availableActions.push('pause', 'complete');
        } else if (status === 'SEDANG_DIPROSES_USER_PAUSED') {
          availableActions.push('resume', 'complete');
        }
      }
      
      // PM actions
      if (isPM && status === 'MENUNGGU_REVIEW_PM') {
        // Check if task creator is PIC/PM
        let creatorIsPMorPIC = false;
        if (item.createdBy && !isCreator) {
          const creatorTeam = await prisma.proyekTeam.findFirst({
            where: {
              projectId: item.projectId,
              pegawaiId: item.createdBy,
            },
          });
          creatorIsPMorPIC = !!(creatorTeam && (
            creatorTeam.teamSource === 'inherited' ||
            (creatorTeam.jabatan && (
              creatorTeam.jabatan.toUpperCase().includes('PM') ||
              creatorTeam.jabatan.toUpperCase().includes('PIC')
            ))
          ));
        }
        
        // PM can approve/reject if they are creator OR task was created by programmer
        if (isCreator || !creatorIsPMorPIC) {
          availableActions.push('approve', 'reject');
        }
      }
      
      // Edit and delete actions
      if (isAssignee || isPM || session.role === 'SUPER_ADMIN') {
        availableActions.push('edit');
      }
      if (isPM || session.role === 'SUPER_ADMIN') {
        availableActions.push('delete');
      }
      
      // Return to backlog action - only for creator if task came from backlog
      if (isCreator && (item as any).sourceBacklogId) {
        availableActions.push('return-to-backlog');
      }
    }
    
    console.log('✅ [GET /api/tasklist/[id]] Final availableActions:', availableActions);

    // Sanitize data to handle NULL values from old tasklist records
    const safeItem = {
      ...sanitizeTasklistData(item),
      proyekNama: proyek?.namaProyek || null,
      moduleNama: modul?.nama || null,
      pegawaiNama: pegawai?.namaLengkap || null,
      pegawaiRole: pegawai?.role || null,
      availableActions // Add available actions to response
    };

    return NextResponse.json({ item: safeItem });
  } catch (e) {
    console.error('GET /api/tasklist/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/tasklist/[id]
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  
  // Parse session from multiple authentication methods (Cookie, X-API-Key, Bearer, Mobile token)
  const session = parseSessionFromRequest(req);
  if (!session) {
    console.log('❌ [AUTH] No valid session found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log('✅ [AUTH] Authenticated user:', { id: session.id, role: session.role, username: session.username });

  // SUPPORT/DEV Project Permission Check
  const permission = await checkTaskPermission(id, session.id, 'edit');
  console.log(`[PUT] Permission check result for task ${id}:`, permission);
  if (!permission.allowed) {
    console.log(`🚫 Permission denied for user ${session.id} to edit task ${id}: ${permission.reason}`);
    return NextResponse.json({ error: permission.reason || 'Permission denied' }, { status: 403 });
  }
  console.log(`✅ [PUT] Permission granted for user ${session.id} to edit task ${id}`);

  const ct = req.headers.get('content-type') || '';

  // Parse multipart once and reuse (avoid reading the body twice)
  let parsedForm: FormData | null = null;
  if (ct.includes('multipart/form-data')) {
    parsedForm = await req.formData();
  }
  // Branch 1a: JSON status-only update (migrated from PATCH)
  if (ct.includes('application/json')) {
    let body: { status?: string; keterangan?: string;[key: string]: unknown };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (body && body.status && !('projectId' in body) && !('moduleId' in body) && !('pegawaiId' in body) && !('scheduleAt' in body)) {
      const desired: string = String(body.status || '');
      const allowedStatuses = new Set(['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI']);
      if (!allowedStatuses.has(desired)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      try {
        const item = await prisma.tasklist.findUnique({ where: { id } });
        if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const current = item.status as string;

        // Check if user is PM (by role OR by jabatan in ProyekTeam)
        let isPM = session.role === 'PM' || session.role === 'SUPER_ADMIN';
        if (!isPM) {
          // Check if user has PM jabatan in this project
          const userTeam = await prisma.proyekTeam.findFirst({
            where: {
              projectId: item.projectId,
              pegawaiId: session.id,
            },
          });
          if (userTeam && userTeam.jabatan && userTeam.jabatan.toUpperCase().includes('PM')) {
            isPM = true;
            console.log(`✅ User ${session.id} is PM in project ${item.projectId} (jabatan: ${userTeam.jabatan})`);
          }
        }

        const isAssignee = item.pegawaiId === session.id;
        const programmersCount = await prisma.proyekTeam.count({
          where: { projectId: item.projectId, jabatan: { contains: 'programmer' } },
        });
        const hasProgrammer = programmersCount > 0;
        const isPMActingAsProgrammer = isPM && !hasProgrammer;
        let ok = false;
        // Allow the assignee to progress their own task through user-side states,
        // regardless of role (PROGRAMMER, PM, ADMIN, SUPER_ADMIN), so PM can process when assigning to self.
        if (isAssignee) {
          if (current === 'MENUNGGU_PROSES_USER' && desired === 'SEDANG_DIPROSES_USER') ok = true;
          if (current === 'SEDANG_DIPROSES_USER' && desired === 'MENUNGGU_REVIEW_PM') ok = true;
          if (current === 'SEDANG_DIPROSES_USER' && desired === 'SEDANG_DIPROSES_USER_PAUSED') ok = true;
          if (current === 'SEDANG_DIPROSES_USER_PAUSED' && desired === 'SEDANG_DIPROSES_USER') ok = true;
        } else if (isPMActingAsProgrammer) {
          // Fallback: if project has no programmer, PM can act on behalf of user
          if (current === 'MENUNGGU_PROSES_USER' && desired === 'SEDANG_DIPROSES_USER') ok = true;
          if (current === 'SEDANG_DIPROSES_USER' && desired === 'MENUNGGU_REVIEW_PM') ok = true;
          if (current === 'SEDANG_DIPROSES_USER' && desired === 'SEDANG_DIPROSES_USER_PAUSED') ok = true;
          if (current === 'SEDANG_DIPROSES_USER_PAUSED' && desired === 'SEDANG_DIPROSES_USER') ok = true;
        }
        if (isPM) {
          // Check if task creator is PIC/PM (has PM in jabatan)
          // BUT: If current user IS the creator, they can approve/reject their own task
          const isCreator = item.createdBy === session.id;

          // Mobile requests (static API key) bypass creator check —
          // mobile user identity is not mapped to a real Logbook user id
          const isMobileRequest = session.username === 'mobile_pm' || session.username?.startsWith('mobile_');

          let creatorIsPMorPIC = false;
          if (!isMobileRequest && item.createdBy && !isCreator) {
            const creatorTeam = await prisma.proyekTeam.findFirst({
              where: {
                projectId: item.projectId,
                pegawaiId: item.createdBy,
              },
            });

            creatorIsPMorPIC = !!(creatorTeam && (
              creatorTeam.teamSource === 'inherited' ||
              (creatorTeam.jabatan && (
                creatorTeam.jabatan.toUpperCase().includes('PM') ||
                creatorTeam.jabatan.toUpperCase().includes('PIC')
              ))
            ));

            console.log(`🔍 [JSON] Creator check for task ${id}:`, {
              taskId: id,
              createdBy: item.createdBy,
              currentUserId: session.id,
              isCreator,
              creatorTeamSource: creatorTeam?.teamSource,
              creatorJabatan: creatorTeam?.jabatan,
              creatorIsPMorPIC,
              canApprove: !creatorIsPMorPIC || isCreator
            });
          }

          if (isMobileRequest) {
            // Mobile: allow approve/reject tanpa cek creator
            if (current === 'MENUNGGU_REVIEW_PM' && desired === 'SELESAI') ok = true;
            if (current === 'MENUNGGU_REVIEW_PM' && desired === 'MENUNGGU_PROSES_USER') ok = true;
            console.log(`✅ Mobile PM allowed to approve/reject task ${id}`);
          } else if (isCreator || !creatorIsPMorPIC) {
            if (current === 'MENUNGGU_REVIEW_PM' && desired === 'SELESAI') ok = true;
            if (current === 'MENUNGGU_REVIEW_PM' && desired === 'MENUNGGU_PROSES_USER') ok = true;
            console.log(`✅ PM ${session.id} can approve/reject task ${id} (${isCreator ? 'is creator' : 'created by programmer'})`);
          } else {
            console.log(`❌ PM ${session.id} BLOCKED from approve/reject task ${id} (created by different PIC/PM ${item.createdBy})`);
          }
        }
        if (!ok) return NextResponse.json({ error: 'Transition not allowed' }, { status: 403 });
        
        // Declare prev and nextSt early (needed for working hours validation below)
        const prev = current;
        const nextSt = desired;
        
        // ✅ Validasi jam kerja untuk submit (SEDANG_DIPROSES_USER → MENUNGGU_REVIEW_PM)
        if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'MENUNGGU_REVIEW_PM') {
          const submitValidation = await validateProgrammerActionTime(session.id.toString(), 'submit');
          if (!submitValidation.isAllowed) {
            console.log(`⏰ [Working Hours] Task submit blocked - outside working hours`);
            return NextResponse.json(
              createWorkingHoursErrorResponse(submitValidation),
              { status: 400 }
            );
          }
          console.log(`✅ [Working Hours] Task submit allowed - within working hours`);
        }
        
        // ✅ Validasi jam kerja untuk approve/reject (MENUNGGU_REVIEW_PM → SELESAI atau MENUNGGU_PROSES_USER)
        if (prev === 'MENUNGGU_REVIEW_PM' && (nextSt === 'SELESAI' || nextSt === 'MENUNGGU_PROSES_USER')) {
          const actionName = nextSt === 'SELESAI' ? 'approve' : 'reject';
          const approveValidation = await validateProgrammerActionTime(session.id.toString(), actionName);
          if (!approveValidation.isAllowed) {
            console.log(`⏰ [Working Hours] Task ${actionName} blocked - outside working hours`);
            return NextResponse.json(
              createWorkingHoursErrorResponse(approveValidation),
              { status: 400 }
            );
          }
          console.log(`✅ [Working Hours] Task ${actionName} allowed - within working hours`);
        }
        
        const updateData: Prisma.TasklistUpdateInput = { status: desired as TaskStatus };
        const updated = await prisma.tasklist.update({ where: { id }, data: updateData });
        // Build descriptive status message
        const statusMsg = (() => {
          if (prev === 'MENUNGGU_PROSES_USER' && nextSt === 'SEDANG_DIPROSES_USER') return 'Task dimulai';
          if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'MENUNGGU_REVIEW_PM') return 'Task dikirim untuk review';
          if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'SEDANG_DIPROSES_USER_PAUSED') return 'Task dihentikan';
          if (prev === 'SEDANG_DIPROSES_USER_PAUSED' && nextSt === 'SEDANG_DIPROSES_USER') return 'Task dilanjutkan';
          if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'SELESAI') return 'Task di-approve';
          if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'MENUNGGU_PROSES_USER') return 'Task direject';
          return `Status diubah: ${prev} -> ${nextSt}`;
        })();
        // If starting and id_crm present, notify CRM
        if (prev === 'MENUNGGU_PROSES_USER' && nextSt === 'SEDANG_DIPROSES_USER') {
          const idCrm = item.idCrm ?? null;
          if (idCrm) await notifyCrmClockIn(String(idCrm));
        }
        // If sent for review, notify PM
        if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'MENUNGGU_REVIEW_PM') {
          await notifyPMForReview(item as any);
        }
        // If approved (done) and id_crm present, notify CRM
        if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'SELESAI') {
          const idCrm = (item as any).idCrm ?? (item as any).id_crm ?? null;

          // Notify old CRM system (legacy)
          if (idCrm) await notifyCrmDone(String(idCrm));

          // NOTE: New CRM notification with image is now handled via separate endpoint
          // POST /api/tasklist/[id]/notify-crm
          // This allows PM to provide completion notes and upload image via modal

          // Auto-create UAT when development or blueprint task is completed
          const taskType = item.tasklistType;
          if (taskType === 'DEVELOPMENT' || taskType === 'BLUEPRINT') {
            await createUATFromCompletedTask(item as any);
          }
        }

        // Send status change notifications
        try {
          const updaterName = 'System'; // Session doesn't have namaLengkap/username in this context

          // Debug: Log status transition
          console.log(`🔍 [Status Transition] ${prev} -> ${nextSt} (Project: ${item.projectId})`);

          // ✅ Log activity
          await logTaskActivity({
            taskId: id,
            userId: session.id,
            action: 'STATUS_CHANGE',
            fromStatus: prev,
            toStatus: nextSt,
            note: body?.keterangan ? String(body.keterangan) : undefined
          });

          // Send specific notifications based on status transition
          // Note: Start and Submit notifications are handled in taskTimeTracker.ts
          // to avoid duplication since those actions go through time-tracking endpoint

          if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'SELESAI') {
            // ✅ Task approved - notify creator + PM + assignee
            const template = notificationTemplates['task.approved'](updated.kode, updaterName);
            await notifyCreatorAndPM({
              taskId: id,
              eventType: 'task.approved',
              template,
              fromUserId: session.id,
              fromUserName: updaterName
            });
            // ✅ FIX: notifyCreatorAndPM now handles creator, PM, AND assignee
            // No need for separate sendTaskNotification call
          } else if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'MENUNGGU_PROSES_USER') {
            // ✅ Task rejected - notify creator + PM + assignee
            const reason = body?.keterangan ? String(body.keterangan) : undefined;
            const template = notificationTemplates['task.rejected'](updated.kode, updaterName, reason);
            await notifyCreatorAndPM({
              taskId: id,
              eventType: 'task.rejected',
              template,
              fromUserId: session.id,
              fromUserName: updaterName
            });
            // ✅ FIX: notifyCreatorAndPM now handles creator, PM, AND assignee
            // No need for separate sendTaskNotification call

            // Note: Timer is now handled by time-tracking API endpoint
            // Clear startedAt and pausedAt fields when task is rejected
            await prisma.tasklist.update({
              where: { id },
              data: {
                startedAt: null,
                pausedAt: null
              }
            });
            console.log(`🔄 Cleared startedAt/pausedAt for rejected task ${updated.kode}`);
          }
        } catch (notifError) {
          console.error('Failed to send status change notification:', notifError);
        }

        // Log status change (raw SQL, safe)
        try {
          await ensureLogTable();
          // Build log message with clear separation of status and note
          // Debug: Check if keterangan exists
          console.log(`📝 [STATUS LOG] Task ${id} status change:`, {
            prev,
            next: nextSt,
            hasKeterangan: !!body?.keterangan,
            keterangan: body?.keterangan || '(none)'
          });

          // For reject (PM): "Keterangan dari PM"
          // For submit (Programmer): "Keterangan dari programmer"
          let logMessage = statusMsg;
          if (body?.keterangan) {
            const noteLabel = (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'MENUNGGU_PROSES_USER')
              ? 'Keterangan dari PM'
              : 'Keterangan dari programmer';
            logMessage = `${statusMsg}\n\n${noteLabel}:\n${String(body.keterangan)}`;
          }

          // Calculate totalStartStopMinutes for APPROVE/REJECT events
          let totalStartStopMinutes = 0;
          if (prev === 'MENUNGGU_REVIEW_PM' && (nextSt === 'SELESAI' || nextSt === 'MENUNGGU_PROSES_USER')) {
            // Get all logs for this task to calculate cumulative duration
            const logs = await prisma.tasklistLog.findMany({
              where: { taskId: id },
              orderBy: { waktu: 'asc' }
            });

            // Get the last STOP/KIRIM event's totalStartStopMinutes
            for (let i = logs.length - 1; i >= 0; i--) {
              const log = logs[i];
              const action = log.action?.toLowerCase() || '';
              const keterangan = log.keterangan?.toLowerCase() || '';
              const fullText = `${action} ${keterangan}`.toLowerCase();

              if (
                action === 'stop' ||
                action === 'pause' ||
                fullText.includes('task stopped') ||
                fullText.includes('task paused') ||
                fullText.includes('dikirim untuk review')
              ) {
                totalStartStopMinutes = (log as any).totalStartStopMinutes || 0;
                break;
              }
            }

            // Add custom duration if exists
            const customMinutes = updated.customDurationHours ? Math.round(Number(updated.customDurationHours) * 60) : 0;
            totalStartStopMinutes += customMinutes;
          }

          const nowTs = new Date();
          await prisma.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action, "imagePath", "totalStartStopMinutes")
            VALUES (${id}, (${nowTs}::timestamptz AT TIME ZONE 'Asia/Jakarta')::timestamp, ${session.id}, ${logMessage}, ${updated.status}::text::"TaskStatus", 'STATUS_CHANGE', ${null}, ${Math.round(totalStartStopMinutes)})`;
        } catch (e) {
          console.error('TasklistLog insert (status) failed', e);
        }
        return NextResponse.json({ item: updated });
      } catch (e) {
        console.error('PUT /api/tasklist/[id] status update error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    }
  }

  // Branch 1b: Multipart status-only update (optional note/image) used by Kirim Review/Reject with attachment
  if (ct.includes('multipart/form-data')) {
    console.error('🔥 ENTERED BRANCH 1B - MULTIPART STATUS UPDATE 🔥');
    const form = parsedForm as FormData;
    const hasFullFields = form.has('projectId') || form.has('moduleId') || form.has('pegawaiId') || form.has('scheduleAt');
    const nextStatusRaw = form.get('status');
    console.error('🔥 nextStatusRaw:', nextStatusRaw);
    console.error('🔥 hasFullFields:', hasFullFields);
    if (nextStatusRaw && !hasFullFields) {
      console.error('🔥 CONDITION MET - PROCESSING STATUS UPDATE 🔥');
      const desired = String(nextStatusRaw || '');
      const allowedStatuses = new Set(['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI']);
      if (!allowedStatuses.has(desired)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      const item = await prisma.tasklist.findUnique({ where: { id } });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const current = item.status as string;

      // Check if status already matches
      const statusAlreadyMatches = current === desired;

      // If status matches but we have note or image, we still need to create a log entry
      const ketRaw = form.get('keterangan');
      const note = ketRaw ? String(ketRaw) : null;
      const hasImages = form.has('images') || form.has('image'); // Check both 'images' (plural) and 'image' (singular)

      console.log('🔍 [BRANCH 1B] Checking note and images:', {
        hasNote: !!note,
        hasImages,
        imagesCount: form.getAll('images').length,
        statusAlreadyMatches
      });

      if (statusAlreadyMatches && !note && !hasImages) {
        console.log('Status already matches and no note/image to log:', { taskId: id, status: current });
        return NextResponse.json({ message: 'Status already up to date' }, { status: 200 });
      }
      const isPM = session.role === 'PM' || session.role === 'SUPER_ADMIN';
      const isAssignee = item.pegawaiId === session.id;
      const programmersCount = await prisma.proyekTeam.count({ where: { projectId: item.projectId, jabatan: { contains: 'programmer' } } });
      const hasProgrammer = programmersCount > 0;
      const isPMActingAsProgrammer = isPM && !hasProgrammer;
      let ok = false;
      if (isAssignee) {
        if (current === 'MENUNGGU_PROSES_USER' && desired === 'SEDANG_DIPROSES_USER') ok = true;
        if (current === 'SEDANG_DIPROSES_USER' && desired === 'MENUNGGU_REVIEW_PM') ok = true;
        if (current === 'SEDANG_DIPROSES_USER' && desired === 'SEDANG_DIPROSES_USER_PAUSED') ok = true;
        if (current === 'SEDANG_DIPROSES_USER_PAUSED' && desired === 'SEDANG_DIPROSES_USER') ok = true;
      } else if (isPMActingAsProgrammer) {
        if (current === 'MENUNGGU_PROSES_USER' && desired === 'SEDANG_DIPROSES_USER') ok = true;
        if (current === 'SEDANG_DIPROSES_USER' && desired === 'MENUNGGU_REVIEW_PM') ok = true;
        if (current === 'SEDANG_DIPROSES_USER' && desired === 'SEDANG_DIPROSES_USER_PAUSED') ok = true;
        if (current === 'SEDANG_DIPROSES_USER_PAUSED' && desired === 'SEDANG_DIPROSES_USER') ok = true;
      }
      if (isPM) {
        const isCreator = item.createdBy === session.id;
        const isMobileRequest = session.username === 'mobile_pm' || session.username?.startsWith('mobile_');

        let creatorIsPMorPIC = false;
        if (!isMobileRequest && item.createdBy && !isCreator) {
          const creatorTeam = await prisma.proyekTeam.findFirst({
            where: {
              projectId: item.projectId,
              pegawaiId: item.createdBy,
            },
          });

          creatorIsPMorPIC = !!(creatorTeam && (
            creatorTeam.teamSource === 'inherited' ||
            (creatorTeam.jabatan && (
              creatorTeam.jabatan.toUpperCase().includes('PM') ||
              creatorTeam.jabatan.toUpperCase().includes('PIC')
            ))
          ));

          console.log(`🔍 [Multipart] Creator check for task ${id}:`, {
            taskId: id,
            createdBy: item.createdBy,
            currentUserId: session.id,
            isCreator,
            creatorTeamSource: creatorTeam?.teamSource,
            creatorJabatan: creatorTeam?.jabatan,
            creatorIsPMorPIC,
            canApprove: !creatorIsPMorPIC || isCreator
          });
        }

        if (isMobileRequest) {
          if (current === 'MENUNGGU_REVIEW_PM' && desired === 'SELESAI') ok = true;
          if (current === 'MENUNGGU_REVIEW_PM' && desired === 'MENUNGGU_PROSES_USER') ok = true;
          console.log(`✅ Mobile PM allowed to approve/reject task ${id}`);
        } else if (isCreator || !creatorIsPMorPIC) {
          if (current === 'MENUNGGU_REVIEW_PM' && desired === 'SELESAI') ok = true;
          if (current === 'MENUNGGU_REVIEW_PM' && desired === 'MENUNGGU_PROSES_USER') ok = true;
          console.log(`✅ [Multipart] PM ${session.id} can approve/reject task ${id} (${isCreator ? 'is creator' : 'created by programmer'})`);
        } else {
          console.log(`❌ [Multipart] PM ${session.id} BLOCKED from approve/reject task ${id} (created by different PIC/PM ${item.createdBy})`);
        }
      }

      // Allow same status if we have note or image to log
      if (statusAlreadyMatches && (note || hasImages)) {
        console.log('Allowing same status transition because we have note/image to log');
        ok = true;
      }

      if (!ok) {
        console.error('Status transition not allowed:', {
          taskId: id,
          userId: session.id,
          userRole: session.role,
          currentStatus: current,
          desiredStatus: desired,
          isAssignee,
          isPM,
          isPMActingAsProgrammer,
          hasProgrammer,
          statusAlreadyMatches,
          hasNote: !!note,
          hasImage: hasImages
        });
        return NextResponse.json({ error: 'Transition not allowed' }, { status: 403 });
      }

      // ✅ Validasi jam kerja untuk submit (SEDANG_DIPROSES_USER → MENUNGGU_REVIEW_PM)
      if (current === 'SEDANG_DIPROSES_USER' && desired === 'MENUNGGU_REVIEW_PM') {
        const submitValidation = await validateProgrammerActionTime(session.id.toString(), 'submit');
        if (!submitValidation.isAllowed) {
          console.log(`⏰ [Working Hours] Task submit blocked - outside working hours`);
          return NextResponse.json(
            createWorkingHoursErrorResponse(submitValidation),
            { status: 400 }
          );
        }
        console.log(`✅ [Working Hours] Task submit allowed - within working hours`);
      }
      
      // ✅ Validasi jam kerja untuk approve/reject (MENUNGGU_REVIEW_PM → SELESAI atau MENUNGGU_PROSES_USER)
      if (current === 'MENUNGGU_REVIEW_PM' && (desired === 'SELESAI' || desired === 'MENUNGGU_PROSES_USER')) {
        const actionName = desired === 'SELESAI' ? 'approve' : 'reject';
        const approveValidation = await validateProgrammerActionTime(session.id.toString(), actionName);
        if (!approveValidation.isAllowed) {
          console.log(`⏰ [Working Hours] Task ${actionName} blocked - outside working hours`);
          return NextResponse.json(
            createWorkingHoursErrorResponse(approveValidation),
            { status: 400 }
          );
        }
        console.log(`✅ [Working Hours] Task ${actionName} allowed - within working hours`);
      }

      let imagePath: string | null = null;

      console.log('='.repeat(80));
      console.log('🔍 PROCESSING MULTIPART STATUS UPDATE (BRANCH 1B)');
      console.log('='.repeat(80));
      console.log('Task ID:', id);
      console.log('Raw keterangan from FormData:', ketRaw);
      console.log('Processed note:', note);
      console.log('Note type:', typeof note);
      console.log('Note length:', note?.length || 0);
      console.log('Has Images:', form.getAll('images').length);
      console.log('Desired Status:', desired);
      console.log('='.repeat(80));

      // Handle multiple images
      const uploadedImages: Array<{ fileName: string, originalName: string, filePath: string, fileType: string, fileSize: number }> = [];
      const files = form.getAll('images') as unknown as File[];

      console.log('📸 [IMAGE UPLOAD] Received files from form:', files.length);
      console.log('📸 [IMAGE UPLOAD] Files details:', files.map((f: any) => ({
        name: f?.name,
        type: f?.type,
        size: f?.size,
        hasArrayBuffer: typeof f?.arrayBuffer === 'function'
      })));

      if (files && files.length > 0) {
        try {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
          await fs.mkdir(uploadsDir, { recursive: true });
          console.log('📸 [IMAGE UPLOAD] Upload directory ensured:', uploadsDir);

          for (const file of files) {
            if (file && typeof file === 'object' && 'arrayBuffer' in file) {
              const bytes = Buffer.from(await file.arrayBuffer());
              const ext = (file.name && file.name.includes('.')) ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
              const cleanExt = ext.replace(/[^a-z0-9.]/gi, '').toLowerCase();
              const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${cleanExt}`;
              const fullPath = path.join(uploadsDir, filename);
              await fs.writeFile(fullPath, bytes);

              // Verify file was written successfully
              const stats = await fs.stat(fullPath);
              if (stats.size === 0) {
                throw new Error('File was not written correctly');
              }

              console.log('✅ [IMAGE UPLOAD] File saved successfully:', {
                originalName: file.name,
                fileName: filename,
                size: stats.size,
                path: fullPath
              });

              uploadedImages.push({
                fileName: filename,
                originalName: file.name || filename,
                filePath: `/api/uploads/tasklist/${filename}`,
                fileType: file.type || 'image/jpeg',
                fileSize: stats.size
              });

              // Keep first image as legacy imagePath for backward compatibility
              if (!imagePath) {
                imagePath = `/api/uploads/tasklist/${filename}`;
              }
            }
          }
          console.log('✅ [IMAGE UPLOAD] All files processed. Total uploaded:', uploadedImages.length);
        } catch (e) {
          console.error('❌ [IMAGE UPLOAD] Failed saving uploads (status-only):', {
            taskId: id,
            error: e
          });
          return NextResponse.json({ error: 'Gagal menyimpan file' }, { status: 500 });
        }
      } else {
        console.log('ℹ️ [IMAGE UPLOAD] No files received from form');
      }

      // Only update task if status doesn't match or we need to save programmer description
      let updated = item;
      if (!statusAlreadyMatches) {
        const updateData: Prisma.TasklistUpdateInput = { status: desired as TaskStatus };
        console.log('🔍 CHECKING PROGRAMMER DESCRIPTION CONDITIONS:');
        console.log('Current Status:', current);
        console.log('Desired Status:', desired);
        console.log('Has Note:', !!note);
        console.log('Has Images:', uploadedImages.length);

        // Save programmer description when sending for review
        if (current === 'SEDANG_DIPROSES_USER' && desired === 'MENUNGGU_REVIEW_PM') {
          if (note) {
            console.log('✅ SAVING PROGRAMMER DESCRIPTION (from note):', note.substring(0, 100));
            updateData.programmerDescription = note;
          } else if (uploadedImages.length > 0) {
            console.log('✅ SAVING PROGRAMMER DESCRIPTION (default for images): dengan lampiran');
            updateData.programmerDescription = 'dengan lampiran';
          }
        }

        console.log('💾 UPDATING DATABASE WITH:', updateData);
        updated = await prisma.tasklist.update({ where: { id }, data: updateData });
        console.log('✅ DATABASE UPDATE COMPLETED');
        console.log('Updated task status:', updated.status);
      } else {
        console.log('⏭️  SKIPPING STATUS UPDATE - status already matches');
      }
      const prev = current;
      const nextSt = desired;
      const statusMsg = (() => {
        if (prev === 'MENUNGGU_PROSES_USER' && nextSt === 'SEDANG_DIPROSES_USER') return 'Task dimulai';
        if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'MENUNGGU_REVIEW_PM') return 'Task dikirim untuk review';
        if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'SEDANG_DIPROSES_USER_PAUSED') return 'Task dihentikan';
        if (prev === 'SEDANG_DIPROSES_USER_PAUSED' && nextSt === 'SEDANG_DIPROSES_USER') return 'Task dilanjutkan';
        if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'SELESAI') return 'Task di-approve';
        if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'MENUNGGU_PROSES_USER') return 'Task direject (kembali ke Menunggu Proses)';
        // Handle same status (e.g., when adding image/note to existing status)
        if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'MENUNGGU_REVIEW_PM') return 'Task telah dikirim menunggu review';
        return `Status diubah: ${prev} -> ${nextSt}`;
      })();
      // If starting and id_crm present, notify CRM
      if (prev === 'MENUNGGU_PROSES_USER' && nextSt === 'SEDANG_DIPROSES_USER') {
        const idCrm = item.idCrm ?? null;
        if (idCrm) await notifyCrmClockIn(String(idCrm));
      }
      // If sent for review, notify PM
      if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'MENUNGGU_REVIEW_PM') {
        await notifyPMForReview(item as any);
      }
      // If approved (done) and id_crm present, notify CRM
      if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'SELESAI') {
        const idCrm = (item as any).idCrm ?? (item as any).id_crm ?? null;

        // Notify old CRM system (legacy)
        if (idCrm) await notifyCrmDone(String(idCrm));

        // NOTE: New CRM notification with image is now handled via separate endpoint
        // POST /api/tasklist/[id]/notify-crm
        // This allows PM to provide completion notes and upload image via modal

        // Auto-create UAT when development or blueprint task is completed
        const taskType = item.tasklistType;
        if (taskType === 'DEVELOPMENT' || taskType === 'BLUEPRINT') {
          await createUATFromCompletedTask(item as any);
        }
      }

      // Send status change notifications (multipart branch)
      try {
        const updaterName = 'System'; // Session doesn't have namaLengkap/username in this context

        // Debug: Log status transition
        console.log(`🔍 [Status Transition - Multipart] ${prev} -> ${nextSt} (Project: ${item.projectId})`);

        // Send specific notifications based on status transition
        if (prev === 'SEDANG_DIPROSES_USER' && nextSt === 'MENUNGGU_REVIEW_PM') {
          // NOTE: task.submitted notifications are already sent by notifyPMForReview()
          // which is called earlier (line 611) and sends to ALL PMs in the project
          console.log(`✅ [Multipart] Submit notification already handled by notifyPMForReview()`);
        } else if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'SELESAI') {
          // Notify assignee when task is approved
          const template = notificationTemplates['task.approved'](updated.kode, updaterName);
          await sendTaskNotification({
            type: 'task.approved',
            taskId: id,
            taskCode: updated.kode,
            projectId: item.projectId,
            fromUserId: session.id,
            fromUserName: updaterName,
            toUserId: item.pegawaiId,
            title: template.title,
            message: template.message,
            priority: template.priority,
          });
        } else if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'MENUNGGU_PROSES_USER') {
          // Notify assignee when task is rejected
          try {
            const template = notificationTemplates['task.rejected'](updated.kode, updaterName, note || undefined);
            await sendTaskNotification({
              type: 'task.rejected',
              taskId: id,
              taskCode: updated.kode,
              projectId: item.projectId,
              fromUserId: session.id,
              fromUserName: updaterName,
              toUserId: item.pegawaiId,
              title: template.title,
              message: template.message,
              priority: template.priority,
            });
          } catch (notifError) {
            console.error('Failed to send reject notification:', notifError);
          }
        } else if (!statusAlreadyMatches) {
          // General status change notification to assignee (only if status actually changed)
          const template = notificationTemplates['task.status.changed'](updated.kode, prev, nextSt);
          await sendTaskNotification({
            type: 'task.status.changed',
            taskId: id,
            taskCode: updated.kode,
            projectId: item.projectId,
            fromUserId: session.id,
            fromUserName: updaterName,
            toUserId: item.pegawaiId,
            title: template.title,
            message: template.message,
            priority: template.priority,
          });
        }
      } catch (notifError) {
        console.error('Failed to send status change notification (multipart):', notifError);
      }

      // Clear startedAt when task is rejected (outside notification try-catch)
      if (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'MENUNGGU_PROSES_USER') {
        try {
          // Note: Timer is now handled by time-tracking API endpoint
          // Clear startedAt and pausedAt fields
          await prisma.tasklist.update({
            where: { id },
            data: {
              startedAt: null,
              pausedAt: null
            }
          });
          console.log(`🔄 Cleared startedAt/pausedAt for rejected task ${updated.kode}`);
        } catch (timerError) {
          console.error('Failed to clear startedAt/pausedAt for rejected task:', timerError);
        }
      }

      try {
        await ensureLogTable();

        // Debug: Check if note exists
        console.log(`📝 [STATUS LOG MULTIPART] Task ${id} status change:`, {
          prev,
          next: nextSt,
          hasNote: !!note,
          note: note || '(none)'
        });

        // Build log message with clear separation of status and note
        // For reject (PM): "Keterangan dari PM"
        // For submit (Programmer): "Keterangan dari programmer"
        let logMessage = statusMsg;
        
        // If there's a note, add it to the log message
        if (note) {
          const noteLabel = (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'SEDANG_DIPROSES_USER')
            ? 'Keterangan dari PM'
            : 'Keterangan dari programmer';
          logMessage = `${statusMsg}\n\n${noteLabel}:\n${String(note)}`;
        } 
        // If no note but has images, add default message
        else if (uploadedImages.length > 0) {
          const noteLabel = (prev === 'MENUNGGU_REVIEW_PM' && nextSt === 'SEDANG_DIPROSES_USER')
            ? 'Keterangan dari PM'
            : 'Keterangan dari programmer';
          logMessage = `${statusMsg}\n\n${noteLabel}:\ndengan lampiran`;
          console.log('📸 [LOG] No note provided, using default message for images');
        }

        // Calculate totalStartStopMinutes for APPROVE/REJECT events
        let totalStartStopMinutes = 0;
        if (prev === 'MENUNGGU_REVIEW_PM' && (nextSt === 'SELESAI' || nextSt === 'MENUNGGU_PROSES_USER')) {
          // Get all logs for this task to calculate cumulative duration
          const logs = await prisma.tasklistLog.findMany({
            where: { taskId: id },
            orderBy: { waktu: 'asc' }
          });

          // Get the last STOP/KIRIM event's totalStartStopMinutes
          for (let i = logs.length - 1; i >= 0; i--) {
            const log = logs[i];
            const action = log.action?.toLowerCase() || '';
            const keterangan = log.keterangan?.toLowerCase() || '';
            const fullText = `${action} ${keterangan}`.toLowerCase();

            if (
              action === 'stop' ||
              action === 'pause' ||
              fullText.includes('task stopped') ||
              fullText.includes('task paused') ||
              fullText.includes('dikirim untuk review')
            ) {
              totalStartStopMinutes = (log as any).totalStartStopMinutes || 0;
              break;
            }
          }

          // Add custom duration if exists
          const customMinutes = updated.customDurationHours ? Math.round(Number(updated.customDurationHours) * 60) : 0;
          totalStartStopMinutes += customMinutes;
        }

        const nowTs2 = new Date();
        await prisma.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action, "imagePath", "totalStartStopMinutes")
          VALUES (${id}, (${nowTs2}::timestamptz AT TIME ZONE 'Asia/Jakarta')::timestamp, ${session.id}, ${logMessage}, ${updated.status}::text::"TaskStatus", 'STATUS_CHANGE', ${imagePath}, ${Math.round(totalStartStopMinutes)})`;

        console.log(`✅ [STATUS LOG MULTIPART] Log inserted successfully for task ${id}`);
      } catch (e) {
        console.error('❌ TasklistLog insert (status multipart) failed', e);
      }

      // Save multiple images to tasklist_image table
      if (uploadedImages.length > 0) {
        try {
          console.log('📸 [IMAGE SAVE] Starting to save', uploadedImages.length, 'images to tasklist_image table');
          console.log('📸 [IMAGE SAVE] Task ID:', id);
          console.log('📸 [IMAGE SAVE] Uploaded by:', session.id);
          console.log('📸 [IMAGE SAVE] Images data:', JSON.stringify(uploadedImages, null, 2));
          
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
          console.log('✅ [IMAGE SAVE] Table tasklist_image ensured to exist');

          for (let i = 0; i < uploadedImages.length; i++) {
            const img = uploadedImages[i];
            console.log(`📸 [IMAGE SAVE] Inserting image ${i + 1}/${uploadedImages.length}:`, {
              taskId: id,
              fileName: img.fileName,
              originalName: img.originalName,
              filePath: img.filePath,
              fileType: img.fileType,
              fileSize: img.fileSize,
              uploadedBy: session.id
            });
            
            await prisma.$executeRaw`
              INSERT INTO public.tasklist_image ("taskId", "fileName", "originalName", "filePath", "fileType", "fileSize", "uploadedBy", "uploadedAt")
              VALUES (${id}, ${img.fileName}, ${img.originalName}, ${img.filePath}, ${img.fileType}, ${img.fileSize}, ${session.id}, NOW())
            `;
            console.log(`✅ [IMAGE SAVE] Image ${i + 1} inserted successfully`);
          }
          console.log('✅ [IMAGE SAVE] Successfully saved ALL', uploadedImages.length, 'images to database');
        } catch (e) {
          console.error('❌ [IMAGE SAVE] Failed to save images to tasklist_image table:', e);
          console.error('❌ [IMAGE SAVE] Error details:', {
            message: e instanceof Error ? e.message : 'Unknown error',
            stack: e instanceof Error ? e.stack : undefined,
            uploadedImages: uploadedImages
          });
        }
      } else {
        console.log('ℹ️ [IMAGE SAVE] No images to save (uploadedImages.length = 0)');
      }

      return NextResponse.json({ item: updated });
    }
  }

  // Branch 2: Full update (multipart or JSON with full fields)
  // Only PM/SUPER_ADMIN can perform full updates; block PROGRAMMER and ADMIN here
  if (session.role !== 'PM' && session.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  let projectId: number, moduleId: number, pegawaiId: number, scheduleAt: Date, keterangan: string | null, imagePath: string | undefined;
  let tasklistType: string = 'DEVELOPMENT';
  let taskComplexity: string = 'MEDIUM';
  let customDurationHours: number | null = null;
  let editReason: string | null = null; // Alasan edit task
  // Handle multiple files upload for task edit
  const uploadedEditFiles: Array<{ fileName: string, originalName: string, filePath: string, fileType: string, fileSize: number }> = [];

  if (ct.includes('multipart/form-data')) {
    const form = parsedForm as FormData;
    projectId = Number(form.get('projectId'));
    moduleId = Number(form.get('moduleId'));
    pegawaiId = Number(form.get('pegawaiId'));
    const scheduleAtStr = String(form.get('scheduleAt') || '');
    console.log('🔍 [EDIT MULTIPART] Raw scheduleAt from form:', scheduleAtStr);
    console.log('🔍 [EDIT MULTIPART] scheduleAt type:', typeof form.get('scheduleAt'));
    console.log('🔍 [EDIT MULTIPART] All form keys:', Array.from(form.keys()));
    scheduleAt = parseDateWithoutTimezone(scheduleAtStr);
    const ket = form.get('keterangan');
    keterangan = ket ? String(ket) : null;
    const editReasonRaw = form.get('editReason');
    editReason = editReasonRaw ? String(editReasonRaw) : null;
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
    } else if (customDurStr === '' || customDurStr === null) {
      // Explicitly set to null if field is cleared
      customDurationHours = null;
    }

    // Handle multiple files (new approach)
    const files = form.getAll('files') as unknown as File[];
    console.log('� [Taskk Edit] Files from form:', files.length, 'files');

    if (files && files.length > 0) {
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
        await fs.mkdir(uploadsDir, { recursive: true });

        for (const file of files) {
          if (file && typeof file === 'object' && 'arrayBuffer' in file) {
            // Validate file before processing
            const validation = validateFile(file);
            if (!validation.isValid) {
              console.error(`❌ File validation failed for ${file.name}:`, validation.error);
              return NextResponse.json({ error: validation.error }, { status: 400 });
            }

            console.log('📤 [Task Edit] Processing file:', file.name);
            const bytes = Buffer.from(await file.arrayBuffer());
            const ext = (file.name && file.name.includes('.')) ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
            const cleanExt = ext.replace(/[^a-z0-9.]/gi, '').toLowerCase();
            const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${cleanExt}`;
            const fullPath = path.join(uploadsDir, filename);
            await fs.writeFile(fullPath, bytes);

            // Verify file was written successfully
            const stats = await fs.stat(fullPath);
            if (stats.size === 0) {
              throw new Error('File was not written correctly');
            }

            uploadedEditFiles.push({
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
        console.log('✅ [Task Edit] Uploaded', uploadedEditFiles.length, 'files successfully');
      } catch (e) {
        console.error('❌ [Task Edit] Failed saving uploads', e);
        return NextResponse.json({ error: 'Gagal menyimpan file' }, { status: 500 });
      }
    } else {
      console.log('⚠️ [Task Edit] No files to upload');
    }
  } else {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    projectId = Number(body?.projectId);
    moduleId = Number(body?.moduleId);
    pegawaiId = Number(body?.pegawaiId);
    const scheduleAtStr = String(body?.scheduleAt || '');
    scheduleAt = parseDateWithoutTimezone(scheduleAtStr);
    keterangan = body?.keterangan ? String(body.keterangan) : null;
    if (body?.tasklistType && ['BLUEPRINT', 'DEVELOPMENT', 'MAINTENANCE'].includes(String(body.tasklistType))) {
      tasklistType = String(body.tasklistType);
    }
    if (body?.taskComplexity && ['EASY', 'MEDIUM', 'HARD'].includes(String(body.taskComplexity))) {
      taskComplexity = String(body.taskComplexity);
    }
    if (body?.customDurationHours !== undefined) {
      const durNum = parseFloat(String(body.customDurationHours));
      if (Number.isFinite(durNum) && durNum > 0) {
        customDurationHours = durNum;
      } else {
        customDurationHours = null;
      }
    }
  }
  if (!Number.isFinite(projectId) || !Number.isFinite(moduleId) || !Number.isFinite(pegawaiId) || isNaN(scheduleAt.getTime())) {
    return NextResponse.json({ error: 'projectId, moduleId, pegawaiId, scheduleAt required' }, { status: 400 });
  }
  try {
    const before = await prisma.tasklist.findUnique({ where: { id } });
    const mod = await prisma.proyekModule.findUnique({ where: { id: moduleId } });
    if (!mod || mod.projectId !== projectId) return NextResponse.json({ error: 'Invalid module for project' }, { status: 400 });
    if (!mod.isLeaf) {
      const childCount = await prisma.proyekModule.count({ where: { parentId: moduleId } });
      if (childCount > 0) return NextResponse.json({ error: 'Module must be a leaf' }, { status: 400 });
    }
    // ensure pegawai is in the project's team
    const teamMember = await prisma.proyekTeam.findFirst({ where: { projectId, pegawaiId } });
    if (!teamMember) return NextResponse.json({ error: 'Pegawai bukan anggota tim proyek' }, { status: 400 });
    const proyek = await prisma.proyek.findUnique({ where: { id: projectId } });
    if (!proyek) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 400 });
    const kode = await generateTasklistKode(prisma);

    // Auto-determine complexity from custom duration if provided
    if (customDurationHours) {
      taskComplexity = await determineComplexityFromHours(customDurationHours);
      console.log(`[Edit] Auto-determined complexity from ${customDurationHours} hours: ${taskComplexity}`);
    }

    // Check if we need to recalculate due date
    const needsRecalculation = before && (
      before.scheduleAt.getTime() !== scheduleAt.getTime() ||
      before.taskComplexity !== taskComplexity ||
      // Check if customDurationHours changed (including null -> value or value -> null)
      (before.customDurationHours?.toString() !== customDurationHours?.toString())
    );

    const data: Prisma.TasklistUpdateInput = {
      project: { connect: { id: projectId } },
      module: { connect: { id: moduleId } },
      pegawai: { connect: { id: pegawaiId } },
      scheduleAt,
      keterangan: keterangan || null,
      kode,
      tasklistType: tasklistType as 'BLUEPRINT' | 'DEVELOPMENT' | 'MAINTENANCE',
      taskComplexity: taskComplexity as 'EASY' | 'MEDIUM' | 'HARD',
      customDurationHours: customDurationHours
    };

    // Recalculate due date if needed
    if (needsRecalculation) {
      console.log('📅 Recalculating due date with smart scheduling...');
      
      try {
        // Determine duration in minutes
        let durationMinutes = 0;
        if (customDurationHours) {
          durationMinutes = Math.round(customDurationHours * 60);
          console.log(`Using custom duration: ${customDurationHours} hours = ${durationMinutes} minutes`);
        } else {
          // Get default duration from TaskComplexity master table
          const complexityMaster = await prisma.taskComplexity.findUnique({
            where: { complexity: taskComplexity as any }
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

        // Calculate schedule using JWT working hours + break time
        const scheduleResult = await calculateTaskSchedule(pegawaiId, scheduleAt, durationMinutes);
        data.calculatedDueDate = scheduleResult.endTime;
        
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
          const newDueDate = addWorkingHours(scheduleAt, customDurationHours, DEFAULT_CONFIG);
          data.calculatedDueDate = newDueDate;
          console.log(`Fallback - Using custom duration: ${customDurationHours}h -> Due: ${newDueDate.toISOString()}`);
        } else {
          const newDueDate = await setTaskDueDateOnCreate(scheduleAt, taskComplexity as 'EASY' | 'MEDIUM' | 'HARD');
          if (newDueDate) {
            data.calculatedDueDate = newDueDate;
            console.log(`Fallback - Using complexity-based duration: ${taskComplexity}`);
          }
        }
      }
    }

    if (imagePath !== undefined) data.imagePath = imagePath; // only update if new file uploaded
    const updated = await prisma.tasklist.update({ where: { id }, data });

    // Note: Notification will be sent later after change summary is built

    // Build change summary
    const changes: string[] = [];
    try {
      if (before) {
        // Names lookup
        const projIds = Array.from(new Set([before.projectId, projectId].filter((v) => Number.isFinite(v)))) as number[];
        const modIds = Array.from(new Set([before.moduleId, moduleId].filter((v) => Number.isFinite(v)))) as number[];
        const empIds = Array.from(new Set([before.pegawaiId, pegawaiId].filter((v) => Number.isFinite(v)))) as number[];
        const [projs, mods, emps] = await Promise.all([
          prisma.proyek.findMany({ where: { id: { in: projIds } } }),
          prisma.proyekModule.findMany({ where: { id: { in: modIds } } }),
          prisma.pegawai.findMany({ where: { id: { in: empIds } } }),
        ]);
        const mapP = new Map(projs.map((p) => [p.id, p.namaProyek]));
        const mapM = new Map(mods.map((m) => [m.id, m.nama]));
        const mapE = new Map(emps.map((e) => [e.id, e.namaLengkap]));
        const fmtDate = (d: Date) => {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}-${mm}-${yyyy}`;
        };
        if (before.projectId !== projectId) changes.push(`Proyek: ${mapP.get(before.projectId) || before.projectId} -> ${mapP.get(projectId) || projectId}`);
        if (before.moduleId !== moduleId) changes.push(`Modul: ${mapM.get(before.moduleId) || before.moduleId} -> ${mapM.get(moduleId) || moduleId}`);
        if (before.pegawaiId !== pegawaiId) changes.push(`User: ${mapE.get(before.pegawaiId) || before.pegawaiId} -> ${mapE.get(pegawaiId) || pegawaiId}`);
        const beforeDate = new Date(before.scheduleAt);
        const afterDate = new Date(scheduleAt);
        if (beforeDate.setHours(0, 0, 0, 0) !== afterDate.setHours(0, 0, 0, 0)) changes.push(`Due Date: ${fmtDate(new Date(before.scheduleAt))} -> ${fmtDate(new Date(scheduleAt))}`);
        const beforeKet = before.keterangan || '';
        const afterKet = keterangan || '';
        if (beforeKet !== afterKet) changes.push('Keterangan diubah');
        if (before.tasklistType !== tasklistType) {
          const typeLabels: Record<string, string> = { BLUEPRINT: 'Blueprint', DEVELOPMENT: 'Development', MAINTENANCE: 'Maintenance' };
          const beforeType = typeLabels[before.tasklistType] || before.tasklistType;
          const afterType = typeLabels[tasklistType] || tasklistType;
          changes.push(`Tipe: ${beforeType} -> ${afterType}`);
        }
        if (before.taskComplexity !== taskComplexity) {
          const complexityLabels: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', 'HARD': 'Hard' };
          const beforeComplexity = complexityLabels[before.taskComplexity] || before.taskComplexity;
          const afterComplexity = complexityLabels[taskComplexity] || taskComplexity;
          changes.push(`Kompleksitas: ${beforeComplexity} -> ${afterComplexity}`);
        }
        // Track custom duration changes
        const beforeCustomDuration = before.customDurationHours ? Number(before.customDurationHours) : null;
        const afterCustomDuration = customDurationHours;
        if (beforeCustomDuration !== afterCustomDuration) {
          const beforeLabel = beforeCustomDuration ? `${beforeCustomDuration} jam` : 'Tidak ada';
          const afterLabel = afterCustomDuration ? `${afterCustomDuration} jam` : 'Tidak ada';
          changes.push(`Durasi Custom: ${beforeLabel} -> ${afterLabel}`);
        }
      }
    } catch (e) {
      console.error('Error building change summary:', e);
    }

    // Log the changes if any
    console.log('🔍 [Task Edit Debug] Changes detected:', changes.length, 'changes:', changes);
    console.log('🔍 [Task Edit Debug] Edit Reason:', editReason);
    console.log('🔍 [Task Edit Debug] Will create log:', changes.length > 0 || !!editReason);

    if (changes.length > 0 || editReason) {
      try {
        let logMessage = '';
        if (changes.length > 0) {
          logMessage = changes.join(', ');
        }
        if (editReason) {
          logMessage = logMessage ? `${logMessage}\n\nAlasan Edit:\n${editReason}` : `Alasan Edit:\n${editReason}`;
        }
        console.log('📝 [Task Edit] Logging changes with message:', logMessage);
        const nowTs3 = new Date();
        await prisma.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action, "imagePath")
          VALUES (${id}, (${nowTs3}::timestamptz AT TIME ZONE 'Asia/Jakarta')::timestamp, ${session.id}, ${logMessage}, ${updated.status}::text::"TaskStatus", 'UPDATE', ${imagePath})`;
        console.log('✅ [Task Edit] Log created successfully');
      } catch (e) {
        console.error('TasklistLog insert (update) failed', e);
      }
    } else {
      console.log('⏭️  [Task Edit] Skipping log creation - no changes and no edit reason');
    }

    // Save multiple files to tasklist_image table (if any were uploaded during edit)
    if (uploadedEditFiles.length > 0) {
      try {
        console.log('� [[Task Edit] Saving', uploadedEditFiles.length, 'files to tasklist_image table');
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

        for (const file of uploadedEditFiles) {
          await prisma.$executeRaw`
            INSERT INTO public.tasklist_image ("taskId", "fileName", "originalName", "filePath", "fileType", "fileSize", "uploadedBy", "uploadedAt")
            VALUES (${id}, ${file.fileName}, ${file.originalName}, ${file.filePath}, ${file.fileType}, ${file.fileSize}, ${session.id}, NOW())
          `;
        }
        console.log('✅ [Task Edit] Successfully saved', uploadedEditFiles.length, 'files to database');
      } catch (e) {
        console.error('❌ [Task Edit] Failed to save files to tasklist_image table:', e);
      }
    }

    // Always send notification when task is edited (regardless of changes detected)
    try {
      const updaterName = 'System'; // Session doesn't have namaLengkap/username in this context
      const template = notificationTemplates['task.updated'](updated.kode, updaterName);

      console.log('🔔 [Task Edit] Sending notification to user:', pegawaiId, 'for task:', updated.kode);

      const changesSummary = changes.length > 0 ? changes.join(', ') : 'Task diupdate';

      await sendTaskNotification({
        type: 'task.updated',
        taskId: id,
        taskCode: updated.kode,
        projectId: projectId,
        projectName: proyek?.namaProyek,
        fromUserId: session.id,
        fromUserName: updaterName,
        toUserId: pegawaiId,
        title: template.title,
        message: changes.length > 0 ? `${template.message}\n\nPerubahan: ${changesSummary}` : template.message,
        priority: template.priority,
      });

      console.log('✅ [Task Edit] Notification sent successfully');
    } catch (notifError) {
      console.error('❌ [Task Edit] Failed to send task edit notification:', notifError);
    }

    // ✅ Send WhatsApp notification if assignee changed (task reassignment)
    if (before && before.pegawaiId !== pegawaiId) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📱 [Task Reassign WA] Assignee changed, sending WhatsApp notification');
      console.log('👤 [Task Reassign WA] Old Assignee ID:', before.pegawaiId);
      console.log('👤 [Task Reassign WA] New Assignee ID:', pegawaiId);
      console.log('📋 [Task Reassign WA] Task:', updated.kode);

      try {
        // Get new assignee with phone number
        const newAssignee = await prisma.pegawai.findUnique({
          where: { id: pegawaiId },
          select: { namaLengkap: true, noHp: true },
        });

        console.log('👤 [Task Reassign WA] New Assignee Data:', {
          name: newAssignee?.namaLengkap,
          hasPhone: !!newAssignee?.noHp,
          phone: newAssignee?.noHp ? `${newAssignee.noHp.substring(0, 4)}****` : 'NO PHONE'
        });

        if (newAssignee?.noHp) {
          const cleanPhone = cleanPhoneNumber(newAssignee.noHp);
          console.log('📞 [Task Reassign WA] Phone validation:', {
            original: newAssignee.noHp,
            cleaned: cleanPhone,
            isValid: !!cleanPhone
          });

          if (cleanPhone) {
            // Get module info
            const module = await prisma.proyekModule.findUnique({
              where: { id: moduleId },
              select: { nama: true },
            });

            const updaterName = 'System'; // Session doesn't have namaLengkap/username in this context
            const message = `${newAssignee.namaLengkap},

📋 *TASK DITUGASKAN ULANG*

Anda mendapat task yang telah di-reassign:

🏢 *Proyek:* ${proyek?.namaProyek || 'N/A'}
📁 *Modul:* ${module?.nama || 'N/A'}
🔢 *Kode Task:* ${updated.kode}
👤 *Ditugaskan oleh:* ${updaterName}${updated.keterangan ? `

*Keterangan Task:*
${updated.keterangan}` : ''}

Mohon segera cek dan kerjakan task ini.

_(Pesan otomatis dari Richz-Log)_`;

            console.log('📤 [Task Reassign WA] Calling sendWhatsAppMessage...');
            console.log('📤 [Task Reassign WA] Message length:', message.length);
            console.log('📤 [Task Reassign WA] To:', cleanPhone);

            // Send notification (non-blocking)
            sendWhatsAppMessage({
              to: cleanPhone,
              message,
              taskId: id,
              notificationType: 'task_assigned',
            }).then(result => {
              if (result.success) {
                console.log('✅ [Task Reassign WA] WhatsApp sent successfully to:', newAssignee.namaLengkap);
                console.log('✅ [Task Reassign WA] Message ID:', result.messageId);
              } else {
                console.error('❌ [Task Reassign WA] WhatsApp failed:', result.error);
              }
            }).catch(error => {
              console.error('❌ [Task Reassign WA] WhatsApp error:', error);
            });

            console.log('✅ [Task Reassign WA] WhatsApp send initiated (non-blocking)');
          } else {
            console.log('⚠️ [Task Reassign WA] Invalid phone number format');
          }
        } else {
          console.log('⚠️ [Task Reassign WA] New assignee has no phone number');
        }
      } catch (waError) {
        console.error('❌ [Task Reassign WA] Failed to send WhatsApp:', waError);
        console.error('❌ [Task Reassign WA] Error stack:', waError instanceof Error ? waError.stack : 'No stack');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    // Send file upload notification if a new file was uploaded
    if (imagePath !== undefined && imagePath !== before?.imagePath) {
      try {
        const uploaderName = 'System'; // Session doesn't have namaLengkap/username in this context
        const fileName = imagePath.split('/').pop() || 'file';
        const template = notificationTemplates['task.file.uploaded'](updated.kode, uploaderName, fileName);

        console.log('📎 [File Upload] Sending notification to user:', pegawaiId, 'for file:', fileName);

        await sendTaskNotification({
          type: 'task.file.uploaded',
          taskId: id,
          taskCode: updated.kode,
          projectId: projectId,
          projectName: proyek?.namaProyek,
          fromUserId: session.id,
          fromUserName: uploaderName,
          toUserId: pegawaiId,
          title: template.title,
          message: template.message,
          priority: template.priority,
          data: {
            fileName: fileName,
            filePath: imagePath
          }
        });

        console.log('✅ [File Upload] Notification sent successfully');
      } catch (notifError) {
        console.error('❌ [File Upload] Failed to send file upload notification:', notifError);
      }
    }

    return NextResponse.json({ item: updated });
  } catch (e) {
    console.error('PUT /api/tasklist/[id] full update error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/tasklist/[id]
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    // Role guard: Hanya PM/SUPER_ADMIN boleh hapus task (ADMIN/PROGRAMMER dilarang)
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'PM' && session.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // SUPPORT/DEV Project Permission Check
    const permission = await checkTaskPermission(id, session.id, 'delete');
    if (!permission.allowed) {
      console.log(`🚫 Permission denied for user ${session.id} to delete task ${id}: ${permission.reason}`);
      return NextResponse.json({ error: permission.reason || 'Permission denied' }, { status: 403 });
    }

    // Get task info before deletion for notification
    const taskToDelete = await prisma.tasklist.findUnique({
      where: { id }
    });

    if (!taskToDelete) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Get project info for notification
    const project = await prisma.proyek.findUnique({
      where: { id: taskToDelete.projectId },
      select: { namaProyek: true }
    });

    // Delete the task
    await prisma.tasklist.delete({ where: { id } });

    // Notification for task deletion has been disabled to reduce notification noise
    // Users will not be notified when their tasks are deleted
    /*
    try {
      const deleterName = session?.namaLengkap || session?.username || 'System';
      const template = notificationTemplates['task.deleted'](taskToDelete.kode, deleterName);

      console.log('🗑️ [Task Delete] Sending notification to user:', taskToDelete.pegawaiId, 'for deleted task:', taskToDelete.kode);

      await sendTaskNotification({
        type: 'task.deleted',
        taskId: id,
        taskCode: taskToDelete.kode,
        projectId: taskToDelete.projectId,
        projectName: project?.namaProyek,
        fromUserId: session.id,
        fromUserName: deleterName,
        toUserId: taskToDelete.pegawaiId,
        title: template.title,
        message: template.message,
        priority: template.priority,
      });

      console.log('✅ [Task Delete] Notification sent successfully');
    } catch (notifError) {
      console.error('❌ [Task Delete] Failed to send deletion notification:', notifError);
    }
    */

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Return 404 when record not found (Prisma P2025) instead of 500
    if (typeof e === 'object' && e && 'code' in e && (e as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('DELETE /api/tasklist/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}