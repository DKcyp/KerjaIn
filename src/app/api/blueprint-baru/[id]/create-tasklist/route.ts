import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { calculateSlaDeadlines } from '@/lib/slaCalculator';
import { setTaskDueDateOnCreate } from '@/lib/taskDueDateCalculator';
import { addWorkingHours } from '@/lib/workingHoursCalculator';
import { TaskStatus, TasklistType, SlaType } from '@prisma/client';
import { generateTasklistKode } from '@/lib/generateKode';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const {
      moduleId,
      pegawaiId,
      scheduleAt,
      keterangan,
      taskComplexity,
      tasklistType,
      taskBAId,
      baName,
      chatMessage,
      chatFileUrl,
      chatFileName,
      durasi,
    } = await req.json();

    console.log('Create tasklist request:', {
      projectId,
      moduleId,
      pegawaiId,
      scheduleAt,
      keterangan,
      taskComplexity,
      tasklistType,
      taskBAId,
      baName,
      durasi
    });

    // Get blueprint version — priority chain:
    // 1. bacara.version via taskBAId → BATask → BAModule → Bacara (most reliable)
    // 2. bacara.version via moduleId → ProyekModule → Bacara
    // 3. Default '1.0.0' if no bacara is found
    let blueprintVersion: string | null = null;
    let durasiPengerjaan: number | null = durasi ? Number(durasi) : null;

    if (taskBAId) {
      const baTask = await prisma.bATask.findUnique({
        where: { id: parseInt(taskBAId) },
        select: {
          durasiPengerjaan: true,
          module: {
            select: {
              bacara: {
                select: { version: true }
              }
            }
          }
        }
      });
      if (baTask) {
        if (baTask.durasiPengerjaan !== null && baTask.durasiPengerjaan !== undefined) {
          durasiPengerjaan = Number(baTask.durasiPengerjaan);
        }
        const bacaraVersion = baTask.module?.bacara?.version;
        if (bacaraVersion) {
          blueprintVersion = bacaraVersion;
          console.log(`[create-tasklist] Got version from bacara via taskBAId ${taskBAId}: ${blueprintVersion}`);
        }
      }
    }

    if (!blueprintVersion) {
      const proyekModule = await prisma.proyekModule.findUnique({
        where: { id: parseInt(moduleId) },
        select: {
          bacara: {
            select: { version: true }
          }
        }
      });
      if (proyekModule?.bacara?.version) {
        blueprintVersion = proyekModule.bacara.version;
        console.log(`[create-tasklist] Got version from bacara via moduleId ${moduleId}: ${blueprintVersion}`);
      }
    }

    if (!blueprintVersion) {
      blueprintVersion = '1.0.0';
      console.log(`[create-tasklist] No bacara found, using default: ${blueprintVersion}`);
    }

    console.log('Blueprint version resolved:', blueprintVersion);

    // Get session for createdBy
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!moduleId || !scheduleAt) {
      console.error('[create-tasklist] 400: moduleId atau scheduleAt kosong', { moduleId, scheduleAt });
      return NextResponse.json({
        success: false,
        error: 'Module ID dan Schedule At wajib diisi'
      }, { status: 400 });
    }

    // Validate module exists and belongs to project
    const module = await prisma.proyekModule.findUnique({
      where: { id: parseInt(moduleId) }
    });

    if (!module || module.projectId !== projectId) {
      console.error('[create-tasklist] 400: Module tidak ditemukan atau projectId tidak cocok', {
        moduleId,
        moduleFound: !!module,
        moduleProjectId: module?.projectId,
        expectedProjectId: projectId
      });
      return NextResponse.json({
        success: false,
        error: 'Module tidak ditemukan atau tidak milik proyek ini'
      }, { status: 400 });
    }

    // Note: validasi isLeaf dihapus — semua module (parent/child) boleh punya tasklist

    // Validate pegawai exists and is in project team (only if pegawaiId provided)
    let teamMember = null;
    if (pegawaiId) {
      // Check if programmer is already in project team
      teamMember = await prisma.proyekTeam.findFirst({
        where: {
          projectId: projectId,
          pegawaiId: parseInt(pegawaiId)
        }
      });

      // If not in team, add them automatically with PROGRAMMER role
      if (!teamMember) {
        console.log(`Adding programmer ${pegawaiId} to project ${projectId} team`);
        
        // Verify the pegawai exists first
        const pegawai = await prisma.pegawai.findUnique({
          where: { id: parseInt(pegawaiId) }
        });

        if (!pegawai) {
          console.error('[create-tasklist] 400: Programmer tidak ditemukan', { pegawaiId });
          return NextResponse.json({
            success: false,
            error: 'Programmer tidak ditemukan'
          }, { status: 400 });
        }

        // Add to project team
        teamMember = await prisma.proyekTeam.create({
          data: {
            projectId: projectId,
            pegawaiId: parseInt(pegawaiId),
            jabatan: 'PROGRAMMER',
            teamSource: 'blueprint'
          }
        });

        console.log(`Successfully added programmer to team:`, teamMember);
      }
    }

    const taskCode = await generateTasklistKode(prisma);

    // Parse schedule date
    const scheduleDate = new Date(scheduleAt);
    if (isNaN(scheduleDate.getTime())) {
      console.error('[create-tasklist] 400: Format tanggal tidak valid', { scheduleAt });
      return NextResponse.json({
        success: false,
        error: 'Format tanggal tidak valid'
      }, { status: 400 });
    }

    // Calculate SLA deadlines
    const slaDeadlines = await calculateSlaDeadlines(
      taskComplexity as 'EASY' | 'MEDIUM' | 'HARD',
      scheduleDate
    );

    // Calculate due date
    let calculatedDueDate = null;
    if (durasiPengerjaan && durasiPengerjaan > 0) {
      calculatedDueDate = addWorkingHours(scheduleDate, durasiPengerjaan);
      console.log(`[create-tasklist] Calculated due date using working hours from duration (${durasiPengerjaan} hours):`, calculatedDueDate);
    } else {
      calculatedDueDate = await setTaskDueDateOnCreate(
        scheduleDate,
        taskComplexity as 'EASY' | 'MEDIUM' | 'HARD'
      );
      console.log('[create-tasklist] Calculated due date using complexity:', calculatedDueDate);
    }

    // Get project to determine depId
    const project = await prisma.proyek.findUnique({
      where: { id: projectId },
      select: { depId: true }
    });

    // Create tasklist
    const tasklist = await prisma.tasklist.create({
      data: {
        projectId: projectId,
        moduleId: parseInt(moduleId),
        pegawaiId: pegawaiId ? parseInt(pegawaiId) : 0, // 0 if no programmer assigned yet
        createdBy: session?.id || 0,
        depId: project?.depId || null, // Set depId from project
        scheduleAt: scheduleDate,
        keterangan: keterangan || null,
        kode: taskCode,
        statusCode: 1, // MENUNGGU_PROSES_USER
        status: 'MENUNGGU_PROSES_USER' as TaskStatus,
        tasklistType: (tasklistType || 'BLUEPRINT') as TasklistType,
        taskComplexity: taskComplexity as SlaType,
        assigneeStartTaskDeadline: slaDeadlines.assigneeStartTaskDeadline,
        assigneeWorkDeadline: slaDeadlines.assigneeWorkDeadline,
        pmReviewDeadline: slaDeadlines.pmReviewDeadline,
        calculatedDueDate: calculatedDueDate,
        version: blueprintVersion,
        baVersion: blueprintVersion,
      }
    });

    console.log('=== SUCCESS CREATING TASKLIST ===');
    console.log('Tasklist ID:', tasklist.id);
    console.log('Tasklist Code:', tasklist.kode);
    console.log('Tasklist Keterangan:', tasklist.keterangan);
    console.log('Tasklist Programmer ID:', tasklist.pegawaiId);
    console.log('=================================');

    // Mark the blueprint task as approved
    if (taskBAId) {
      try {
        await prisma.bATask.update({
          where: { id: parseInt(taskBAId) },
          data: {
            isApproved: true,
            approvedAt: new Date(),
            approvedBy: session?.id || 0,
            tasklistId: tasklist.id,
          }
        });
        console.log('Blueprint task marked as approved:', taskBAId);
      } catch (error) {
        console.error('Error marking blueprint task as approved:', error);
        // Don't fail the whole operation if this fails
      }
    } else {
      console.warn('No taskBAId provided, cannot mark blueprint task as approved');
    }

    // Create log entry
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action)
         VALUES ($1, NOW(), $2, $3, $4::text::"TaskStatus", $5)`,
        tasklist.id,
        session?.id || 0,
        `Task dibuat dari blueprint approval`,
        'MENUNGGU_PROSES_USER',
        'CREATE'
      );
    } catch (logError) {
      console.error('Failed to create log entry:', logError);
      // Don't fail the whole operation for log error
    }

    // Create chat message from module keterangan
    if (chatMessage) {
      try {
        const detectedFileName = chatFileName || (chatFileUrl ? chatFileUrl.split('/').pop() : null);
        const detectedFileType = chatFileUrl
          ? (chatFileUrl.endsWith('.jpg') || chatFileUrl.endsWith('.jpeg') ? 'image/jpeg'
            : chatFileUrl.endsWith('.png') ? 'image/png'
            : chatFileUrl.endsWith('.gif') ? 'image/gif'
            : chatFileUrl.endsWith('.webp') ? 'image/webp'
            : 'application/octet-stream')
          : null;

        await prisma.tasklistChat.create({
          data: {
            tasklistId: tasklist.id,
            senderId: session?.id || 0,
            message: chatMessage,
            source: 'approve',
            fileUrl: chatFileUrl || null,
            fileName: detectedFileName,
            fileType: detectedFileType,
          }
        });
        console.log('=== SUCCESS CREATING CHAT MESSAGE ===');
        console.log('Tasklist ID:', tasklist.id);
        console.log('Message:', chatMessage);
        console.log('File URL:', chatFileUrl || '(none)');
        console.log('=====================================');
      } catch (chatError) {
        console.error('Failed to create chat message:', chatError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tasklistId: tasklist.id,
        kode: tasklist.kode,
        message: 'Tasklist berhasil dibuat',
        calculatedDueDate: calculatedDueDate?.toISOString() || null,
      }
    });

  } catch (error) {
    console.error('Error creating tasklist:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}