import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSlaDeadlines } from '@/lib/slaCalculator';
import { setTaskDueDateOnCreate } from '@/lib/taskDueDateCalculator';
import { sendWhatsAppMessage, formatTaskAssignmentMessage, cleanPhoneNumber } from '@/lib/whatsappService';
import { generateTasklistKode } from '@/lib/generateKode';
import fs from 'fs/promises';
import path from 'path';

/**
 * External API endpoint for managing tasklists from other applications
 * 
 * POST /api/external/tasklist - Create new tasklist
 * PUT /api/external/tasklist - Update existing tasklist
 * 
 * Authentication: API Key in header (X-API-Key)
 * 
 * Request Body for POST (Create):
 * Content-Type: application/json (for JSON requests)
 * {
 *   "projectCode": "string",        // Project code (required)
 *   "moduleCode": "string",         // Module code within project (required)
 *   "assigneeUsername": "string",   // Username of assignee (required)
 *   "scheduleAt": "ISO date",       // Schedule date/time (required)
 *   "description": "string",        // Task description (optional)
 *   "tasklistType": "DEVELOPMENT",  // BLUEPRINT|DEVELOPMENT|MAINTENANCE (optional, default: DEVELOPMENT)
 *   "taskComplexity": "MEDIUM",     // EASY|MEDIUM|HARD (optional, default: MEDIUM)
 *   "status": "MENUNGGU_PROSES_USER" // Initial status (optional, default: MENUNGGU_PROSES_USER)
 * }
 * 
 * Content-Type: multipart/form-data (for file uploads)
 * Form fields: projectCode, moduleCode, assigneeUsername, scheduleAt, description, tasklistType, taskComplexity, status
 * File fields: files[] (multiple files supported - images, documents, etc.)
 * 
 * Request Body for PUT (Update):
 * {
 *   "taskCode": "string",           // Task code to identify task (required)
 *   "scheduleAt": "ISO date",       // New schedule date/time (optional)
 *   "description": "string",        // New task description (optional)
 *   "taskComplexity": "MEDIUM",     // New complexity (optional)
 *   "status": "SEDANG_DIPROSES_USER" // New status (optional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "task": { ... },
 *     "message": "Task created/updated successfully"
 *   }
 * }
 */

// Validate API Key
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.EXTERNAL_API_KEY;
  
  if (!validApiKey) {
    console.error('EXTERNAL_API_KEY not configured in environment');
    return false;
  }
  
  return apiKey === validApiKey;
}

// Map between status codes and enum strings
const codeToStatus = (code: number | null | undefined): any => {
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

// Ensure log table exists
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
        action TEXT NOT NULL,
        "imagePath" TEXT NULL
      );`
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_task_waktu ON public.tasklist_log ("taskId", waktu DESC);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_user ON public.tasklist_log ("userId");`);
  } catch (e) {
    // ignore
  }
}

// POST - Create new tasklist
export async function POST(request: NextRequest) {
  try {
    // Validate API Key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Parse request body - support both JSON and multipart/form-data
    let body: any;
    let uploadedFiles: File[] = [];
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data with file uploads
      const formData = await request.formData();
      
      // Extract form fields
      body = {
        projectCode: formData.get('projectCode')?.toString(),
        moduleCode: formData.get('moduleCode')?.toString(),
        assigneeUsername: formData.get('assigneeUsername')?.toString(),
        scheduleAt: formData.get('scheduleAt')?.toString(),
        description: formData.get('description')?.toString() || undefined,
        tasklistType: formData.get('tasklistType')?.toString() || 'DEVELOPMENT',
        taskComplexity: formData.get('taskComplexity')?.toString() || 'MEDIUM',
        status: formData.get('status')?.toString() || 'MENUNGGU_PROSES_USER',
        ticketId: formData.get('ticketId')?.toString() || undefined,
        priority: formData.get('priority')?.toString() || undefined,
        ticketUrl: formData.get('ticketUrl')?.toString() || undefined
      };
      
      // Extract files
      const files = formData.getAll('files');
      uploadedFiles = files.filter(f => f instanceof File) as File[];
      
      console.log(`[External API] Received ${uploadedFiles.length} file(s) for upload`);
    } else {
      // Handle JSON request
      body = await request.json();
    }
    
    const { 
      projectCode, 
      moduleCode, 
      assigneeUsername, 
      scheduleAt, 
      description,
      tasklistType = 'DEVELOPMENT',
      taskComplexity = 'MEDIUM',
      status = 'MENUNGGU_PROSES_USER',
      ticketId,
      priority,
      ticketUrl
    } = body;

    // Validate required fields
    if (!projectCode || !moduleCode || !assigneeUsername || !scheduleAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: projectCode, moduleCode, assigneeUsername, and scheduleAt are required' 
        },
        { status: 400 }
      );
    }

    // Validate schedule date
    const scheduleDate = new Date(scheduleAt);
    if (isNaN(scheduleDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduleAt date format' },
        { status: 400 }
      );
    }

    // Validate tasklistType
    if (!['BLUEPRINT', 'DEVELOPMENT', 'MAINTENANCE'].includes(tasklistType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tasklistType. Must be BLUEPRINT, DEVELOPMENT, or MAINTENANCE' },
        { status: 400 }
      );
    }

    // Validate taskComplexity
    if (!['EASY', 'MEDIUM', 'HARD'].includes(taskComplexity)) {
      return NextResponse.json(
        { success: false, error: 'Invalid taskComplexity. Must be EASY, MEDIUM, or HARD' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Create tasklist in transaction (with extended timeout for file uploads and complex operations)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find project by code
      const project = await tx.proyek.findUnique({
        where: { kodeProyek: projectCode }
      });

      if (!project) {
        throw new Error(`Project with code '${projectCode}' not found`);
      }

      // 2. Find module by code within project
      const module = await tx.proyekModule.findFirst({
        where: { 
          projectId: project.id,
          kode: moduleCode,
          isLeaf: true
        }
      });

      if (!module) {
        throw new Error(`Module with code '${moduleCode}' not found in project '${projectCode}' or module is not a leaf`);
      }

      // 3. Find assignee by username
      const assignee = await tx.pegawai.findUnique({
        where: { username: assigneeUsername }
      });

      if (!assignee) {
        throw new Error(`User with username '${assigneeUsername}' not found`);
      }

      // 4. Verify assignee is in project team
      const teamMember = await tx.proyekTeam.findFirst({
        where: { 
          projectId: project.id,
          pegawaiId: assignee.id
        }
      });

      if (!teamMember) {
        throw new Error(`User '${assigneeUsername}' is not a member of project '${projectCode}' team`);
      }

      // 5. Generate task code
      const taskCode = await generateTasklistKode(tx);

      // 6. Calculate SLA deadlines
      const slaDeadlines = await calculateSlaDeadlines(taskComplexity as any, scheduleDate);
      
      // 7. Calculate due date
      const calculatedDueDate = await setTaskDueDateOnCreate(scheduleDate, taskComplexity as any);

      // 8. Handle file uploads if provided
      const uploadedImages: Array<{fileName: string, originalName: string, filePath: string, fileType: string, fileSize: number}> = [];
      let firstImagePath: string | null = null;
      
      if (uploadedFiles.length > 0) {
        try {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
          await fs.mkdir(uploadsDir, { recursive: true });
          
          for (const file of uploadedFiles) {
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
            
            uploadedImages.push({
              fileName: filename,
              originalName: file.name || filename,
              filePath: `/api/uploads/tasklist/${filename}`,
              fileType: file.type || 'application/octet-stream',
              fileSize: stats.size
            });
            
            // Keep first image as legacy imagePath for backward compatibility
            if (!firstImagePath) {
              firstImagePath = `/api/uploads/tasklist/${filename}`;
            }
          }
          
          console.log(`[External API] Successfully uploaded ${uploadedImages.length} file(s)`);
        } catch (uploadError) {
          console.error('[External API] File upload failed:', uploadError);
          throw new Error('Failed to upload files');
        }
      }

      // 9. Ensure CRM ticket columns exist (for backward compatibility)
      try {
        await tx.$executeRawUnsafe(
          `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS ticket_id TEXT NULL;`
        );
        await tx.$executeRawUnsafe(
          `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS ticket_url TEXT NULL;`
        );
      } catch (e) {
        // Columns may already exist, ignore error
      }

      // 10. Create tasklist with CRM ticket information
      const task = await tx.tasklist.create({
        data: {
          projectId: project.id,
          moduleId: module.id,
          pegawaiId: assignee.id,
          scheduleAt: scheduleDate,
          keterangan: description || null,
          kode: taskCode,
          status: status as any,
          statusCode: statusToCode(status),
          tasklistType: tasklistType as any,
          taskComplexity: taskComplexity as any,
          assigneeStartTaskDeadline: slaDeadlines.assigneeStartTaskDeadline,
          assigneeWorkDeadline: slaDeadlines.assigneeWorkDeadline,
          pmReviewDeadline: slaDeadlines.pmReviewDeadline,
          calculatedDueDate: calculatedDueDate,
          imagePath: firstImagePath, // Store first image for backward compatibility
          ticketId: ticketId || null, // CRM ticket ID
          ticketUrl: ticketUrl || null // CRM ticket URL
        }
      });

      if (ticketId) {
        console.log(`[External API] Linked task ${task.id} to CRM ticket ${ticketId}`);
      }

      // 11. Save multiple files to tasklist_image table
      if (uploadedImages.length > 0) {
        try {
          // Ensure tasklist_image table exists
          await tx.$executeRawUnsafe(`
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
          
          for (const img of uploadedImages) {
            await tx.$executeRaw`
              INSERT INTO public.tasklist_image ("taskId", "fileName", "originalName", "filePath", "fileType", "fileSize", "uploadedBy", "uploadedAt")
              VALUES (${task.id}, ${img.fileName}, ${img.originalName}, ${img.filePath}, ${img.fileType}, ${img.fileSize}, ${1}, NOW())
            `;
          }
          console.log(`[External API] Saved ${uploadedImages.length} file(s) to database`);
        } catch (e) {
          console.error('[External API] Failed to save files to database:', e);
        }
      }

      // 12. Log creation
      try {
        await ensureLogTable();
        const logMessage = uploadedImages.length > 0 
          ? `Task created via external API with ${uploadedImages.length} file(s)` 
          : 'Task created via external API';
        await tx.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action, "imagePath")
          VALUES (${task.id}, NOW(), ${1}, ${logMessage}, ${task.status as any}, 'CREATE', ${firstImagePath})`;
      } catch (e) {
        console.error('TasklistLog insert failed', e);
      }

      return {
        task,
        project,
        module,
        assignee,
        uploadedImages
      };
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10s)
      timeout: 15000  // Maximum time for the transaction to complete (15s)
    });

    // Send WhatsApp notification to assignee (non-blocking)
    try {
      console.log('📱 Sending WhatsApp notification to assignee via external API...');
      
      if (result.assignee.noHp) {
        const cleanPhone = cleanPhoneNumber(result.assignee.noHp);
        if (cleanPhone) {
          const notificationMessage = formatTaskAssignmentMessage({
            id: result.task.id,
            kode: result.task.kode || '',
            proyekNama: result.project.namaProyek || '-',
            moduleNama: result.module.nama || '-',
            pegawaiNama: result.assignee.namaLengkap || '-',
            taskComplexity: result.task.taskComplexity,
            assigneeStartTaskDeadline: result.task.assigneeStartTaskDeadline || new Date(),
            scheduleAt: result.task.scheduleAt,
            keterangan: result.task.keterangan || undefined,
            calculatedDueDate: result.task.calculatedDueDate || undefined
          });
          
          // Send notification (non-blocking - don't wait for result)
          sendWhatsAppMessage({
            to: cleanPhone,
            message: notificationMessage,
            taskId: result.task.id,
            notificationType: 'task_assigned'
          }).then(whatsappResult => {
            if (whatsappResult.success) {
              console.log(`✅ WhatsApp notification sent to ${result.assignee.namaLengkap} (${cleanPhone}) via external API`);
            } else {
              console.error(`❌ WhatsApp notification failed for ${result.assignee.namaLengkap}:`, whatsappResult.error);
            }
          }).catch(error => {
            console.error('WhatsApp notification error (external API):', error);
          });
        } else {
          console.log(`⚠️ Invalid phone number for ${result.assignee.namaLengkap}: ${result.assignee.noHp}`);
        }
      } else {
        console.log(`⚠️ No phone number found for assignee ${result.assignee.namaLengkap}`);
      }
    } catch (notificationError) {
      console.error('WhatsApp notification setup failed (non-fatal, external API):', notificationError);
    }

    // Simplify status: only "Sedang di proses" or "Selesai"
    const simplifiedStatus = result.task.status === 'SELESAI' ? 'Selesai' : 'Sedang di proses';

    // Base response object
    const taskResponse: any = {
      id: result.task.id,
      code: result.task.kode,
      description: result.task.keterangan,
      status: simplifiedStatus,
      originalStatus: result.task.status,
      statusCode: result.task.statusCode,
      scheduleAt: result.task.scheduleAt,
      tasklistType: result.task.tasklistType,
      taskComplexity: result.task.taskComplexity,
      imagePath: result.task.imagePath,
      projectId: result.task.projectId,
      projectName: result.project.namaProyek,
      moduleId: result.task.moduleId,
      moduleName: result.module.nama,
      uploadedFiles: result.uploadedImages.map(img => ({
        fileName: img.fileName,
        originalName: img.originalName,
        filePath: img.filePath,
        fileType: img.fileType,
        fileSize: img.fileSize
      })),
      project: {
        id: result.project.id,
        code: result.project.kodeProyek,
        name: result.project.namaProyek
      },
      module: {
        id: result.module.id,
        code: result.module.kode,
        name: result.module.nama
      }
    };

    // Only include deadline and duration fields if tasklistType is DEVELOPMENT
    if (result.task.tasklistType === 'DEVELOPMENT') {
      taskResponse.assigneeStartTaskDeadline = result.task.assigneeStartTaskDeadline;
      taskResponse.assigneeWorkDeadline = result.task.assigneeWorkDeadline;
      taskResponse.pmReviewDeadline = result.task.pmReviewDeadline;
      taskResponse.calculatedDueDate = result.task.calculatedDueDate;
      taskResponse.totalDurationMinutes = result.task.totalDurationMinutes;
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      data: {
        task: taskResponse
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating task via external API:', error);
    
    // Handle specific errors
    if (error.message.includes('not found') || error.message.includes('not a member')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create task',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - Update existing tasklist
export async function PUT(request: NextRequest) {
  try {
    // Validate API Key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      taskCode, 
      scheduleAt, 
      description,
      taskComplexity,
      status
    } = body;

    // Validate required fields
    if (!taskCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: taskCode is required' },
        { status: 400 }
      );
    }

    // Validate optional fields
    let scheduleDate: Date | undefined;
    if (scheduleAt) {
      scheduleDate = new Date(scheduleAt);
      if (isNaN(scheduleDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid scheduleAt date format' },
          { status: 400 }
        );
      }
    }

    if (taskComplexity && !['EASY', 'MEDIUM', 'HARD'].includes(taskComplexity)) {
      return NextResponse.json(
        { success: false, error: 'Invalid taskComplexity. Must be EASY, MEDIUM, or HARD' },
        { status: 400 }
      );
    }

    if (status) {
      const validStatuses = ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Update tasklist in transaction (with extended timeout)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find task by code
      const existingTask = await tx.tasklist.findFirst({
        where: { kode: taskCode }
      });

      if (!existingTask) {
        throw new Error(`Task with code '${taskCode}' not found`);
      }

      // 2. Build update data
      const updateData: any = {};
      const changes: string[] = [];

      if (scheduleDate) {
        updateData.scheduleAt = scheduleDate;
        changes.push(`Schedule updated to ${scheduleDate.toISOString()}`);
      }

      if (description !== undefined) {
        updateData.keterangan = description || null;
        changes.push('Description updated');
      }

      if (taskComplexity) {
        updateData.taskComplexity = taskComplexity;
        changes.push(`Complexity updated to ${taskComplexity}`);
      }

      if (status) {
        updateData.status = status;
        updateData.statusCode = statusToCode(status);
        changes.push(`Status updated to ${status}`);
      }

      // 3. Recalculate due date if schedule or complexity changed
      if (scheduleDate || taskComplexity) {
        const newSchedule = scheduleDate || existingTask.scheduleAt;
        const newComplexity = taskComplexity || existingTask.taskComplexity;
        
        const slaDeadlines = await calculateSlaDeadlines(newComplexity as any, newSchedule);
        const calculatedDueDate = await setTaskDueDateOnCreate(newSchedule, newComplexity as any);
        
        updateData.assigneeStartTaskDeadline = slaDeadlines.assigneeStartTaskDeadline;
        updateData.assigneeWorkDeadline = slaDeadlines.assigneeWorkDeadline;
        updateData.pmReviewDeadline = slaDeadlines.pmReviewDeadline;
        updateData.calculatedDueDate = calculatedDueDate;
        
        changes.push('SLA deadlines recalculated');
      }

      // 4. Update task if there are changes
      if (Object.keys(updateData).length === 0) {
        throw new Error('No valid fields provided for update');
      }

      const updatedTask = await tx.tasklist.update({
        where: { id: existingTask.id },
        data: updateData
      });

      // Fetch related data separately
      const [proyek, module, pegawai] = await Promise.all([
        tx.proyek.findUnique({ where: { id: updatedTask.projectId } }),
        tx.proyekModule.findUnique({ where: { id: updatedTask.moduleId } }),
        updatedTask.pegawaiId ? tx.pegawai.findUnique({ where: { id: updatedTask.pegawaiId } }) : null
      ]);

      // 5. Log update
      try {
        await ensureLogTable();
        const changeSummary = changes.join('; ');
        await tx.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action)
          VALUES (${updatedTask.id}, NOW(), ${1}, ${`Task updated via external API: ${changeSummary}`}, ${updatedTask.status as any}, 'EDIT')`;
      } catch (e) {
        console.error('TasklistLog insert failed', e);
      }

      return {
        updatedTask,
        proyek,
        module,
        pegawai
      };
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10s)
      timeout: 15000  // Maximum time for the transaction to complete (15s)
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      data: {
        task: {
          id: result.updatedTask.id,
          code: result.updatedTask.kode,
          description: result.updatedTask.keterangan,
          status: result.updatedTask.status,
          statusCode: result.updatedTask.statusCode,
          scheduleAt: result.updatedTask.scheduleAt,
          tasklistType: result.updatedTask.tasklistType,
          taskComplexity: result.updatedTask.taskComplexity,
          projectId: result.updatedTask.projectId,
          projectName: result.proyek?.namaProyek || null,
          moduleId: result.updatedTask.moduleId,
          moduleName: result.module?.nama || null,
          project: result.proyek ? {
            id: result.proyek.id,
            code: result.proyek.kodeProyek,
            name: result.proyek.namaProyek
          } : null,
          assignee: result.pegawai ? {
            id: result.pegawai.id,
            username: result.pegawai.username,
            name: result.pegawai.namaLengkap
          } : null
        }
      }
    });

  } catch (error: any) {
    console.error('Error updating task via external API:', error);
    
    // Handle specific errors
    if (error.message.includes('not found') || error.message.includes('No valid fields')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update task',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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

/**
 * GET /api/external/tasklist
 *
 * Role-based tasklist retrieval matching internal web API behavior.
 *
 * Authentication (one of):
 * - X-API-Key header: full admin access. Optionally pass pegawaiId to act as that user.
 * - X-SSO-TOKEN (+ optional X-SSO-USERNAME): SSO authentication
 *
 * Query Parameters:
 * - pegawaiId (optional): Act as this user (API Key auth only). If omitted, returns all tasks.
 * - projectId (optional): Filter by project ID
 * - moduleId (optional): Filter by module ID
 * - teamId (optional): Filter by master team ID
 * - status (optional): Filter by status (single or comma-separated)
 * - tasklistType (optional): BLUEPRINT, DEVELOPMENT, MAINTENANCE
 * - baVersion (optional): Filter by BA version
 * - from (optional): Filter from date (YYYY-MM-DD)
 * - to (optional): Filter to date (YYYY-MM-DD)
 * - page (optional): Page number (default: 1)
 * - size (optional): Items per page (default: 10, max: 100)
 * - sortKey (optional): scheduleAt, proyekNama, moduleNama, pegawaiNama, status, baVersion
 * - sortDir (optional): asc, desc (default: asc)
 * - showAll (optional): If set, includes completed past tasks
 */
export async function GET(request: NextRequest) {
  try {
    // --- Authentication ---
    const apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-Key');
    const ssoToken = request.headers.get('x-sso-token') || request.headers.get('X-SSO-TOKEN');
    const ssoUsername = request.headers.get('x-sso-username') || request.headers.get('X-SSO-USERNAME');

    let authenticatedUser: { id: number; role: string; namaLengkap: string } | null = null;
    let isApiKeyAuth = false;

    if (apiKey) {
      const validApiKey = process.env.EXTERNAL_API_KEY;
      if (apiKey === validApiKey) {
        isApiKeyAuth = true;
      } else {
        return NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 401 });
      }
    } else if (ssoToken) {
      let ssoUser;
      if (ssoUsername) {
        ssoUser = await prisma.pegawai.findFirst({
          where: { username: ssoUsername, ssoUserId: ssoToken },
          select: { id: true, role: true, namaLengkap: true },
        });
      } else {
        ssoUser = await prisma.pegawai.findFirst({
          where: { ssoUserId: ssoToken },
          select: { id: true, role: true, namaLengkap: true },
        });
      }
      if (!ssoUser) {
        return NextResponse.json({ success: false, error: 'Invalid SSO token. User not found.' }, { status: 401 });
      }
      authenticatedUser = ssoUser;
    } else {
      return NextResponse.json(
        { success: false, error: 'Authentication required. Provide X-SSO-TOKEN or X-API-Key header.' },
        { status: 401 }
      );
    }

    // --- Parse Query Parameters ---
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('projectId');
    const moduleIdParam = searchParams.get('moduleId');
    const pegawaiIdParam = searchParams.get('pegawaiId');
    const teamIdParam = searchParams.get('teamId');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const statusParam = searchParams.get('status');
    const tasklistTypeParam = searchParams.get('tasklistType');
    const baVersionParam = searchParams.get('baVersion');
    const pageParam = Math.max(1, Number(searchParams.get('page') || '1'));
    const sizeParam = Math.min(100, Math.max(1, Number(searchParams.get('size') || '10')));
    const sortKey = String(searchParams.get('sortKey') || '').trim();
    const sortDir = String(searchParams.get('sortDir') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const showAll = searchParams.get('showAll');

    // --- Determine effective user and role ---
    let effectiveUserId: number | null = null;
    let effectiveRole = 'SUPER_ADMIN'; // default for API key without pegawaiId

    if (isApiKeyAuth) {
      if (pegawaiIdParam) {
        const eid = Number(pegawaiIdParam);
        if (Number.isFinite(eid)) {
          effectiveUserId = eid;
          // Look up user role
          const user = await prisma.pegawai.findUnique({
            where: { id: eid },
            select: { role: true },
          });
          if (user) effectiveRole = user.role;
        }
      }
      // If no pegawaiId, effectiveUserId stays null => admin access (see all)
    } else {
      // SSO auth: use authenticated user
      effectiveUserId = authenticatedUser!.id;
      effectiveRole = authenticatedUser!.role;
    }

    // --- Build Where Clause (mirrors internal GET /api/tasklist) ---
    let where: any = {};

    if (effectiveRole === 'PM') {
      const teams = await prisma.proyekTeam.findMany({ where: { pegawaiId: effectiveUserId } });
      const projectIds = teams.map((t: any) => t.projectId);
      if (projectIds.length === 0) {
        where = { createdBy: effectiveUserId };
      } else {
        where = { projectId: { in: projectIds } };
      }
    } else if (effectiveRole === 'PROGRAMMER') {
      const userTeamRoles = await prisma.proyekTeam.findMany({
        where: { pegawaiId: effectiveUserId },
        select: { projectId: true, jabatan: true },
      });
      const pmProjectIds: number[] = [];
      const picProjectIds: number[] = [];
      for (const team of userTeamRoles) {
        const jUpper = team.jabatan.toUpperCase();
        if (jUpper.includes('PM')) pmProjectIds.push(team.projectId);
        if (jUpper.includes('PIC')) picProjectIds.push(team.projectId);
      }
      if (pmProjectIds.length > 0 || picProjectIds.length > 0) {
        const managerProjectIds = [...new Set([...pmProjectIds, ...picProjectIds])];
        where = {
          OR: [{ projectId: { in: managerProjectIds } }, { pegawaiId: effectiveUserId }],
        };
      } else {
        where = { pegawaiId: effectiveUserId };
      }
    } else if (effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN') {
      // See all tasks
      where = {};
    }

    // --- Apply optional filters ---
    const qWhere: any = { ...where };

    if (projectIdParam) {
      const pid = Number(projectIdParam);
      if (Number.isFinite(pid)) {
        if (effectiveRole === 'PM' && !pegawaiIdParam) {
          qWhere.projectId = pid;
        } else if (where.projectId && typeof where.projectId === 'object' && 'in' in where.projectId) {
          qWhere.projectId = { in: (where.projectId as { in: number[] }).in.filter((id: number) => id === pid) };
        } else {
          qWhere.projectId = pid;
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
        if (effectiveRole === 'PROGRAMMER' && effectiveUserId === eid) {
          qWhere.pegawaiId = effectiveUserId;
        } else if (effectiveRole !== 'PROGRAMMER') {
          qWhere.pegawaiId = eid;
        }
      }
    }

    // Team filter
    if (teamIdParam) {
      const tid = Number(teamIdParam);
      if (Number.isFinite(tid)) {
        const members = await prisma.masterTeamMember.findMany({
          where: { teamId: tid },
          select: { pegawaiId: true },
        });
        const memberIds = members.map((m: any) => m.pegawaiId);
        if (memberIds.length === 0) {
          qWhere.pegawaiId = { in: [] };
        } else if (typeof qWhere.pegawaiId === 'number') {
          qWhere.pegawaiId = memberIds.includes(qWhere.pegawaiId) ? qWhere.pegawaiId : { in: [] };
        } else {
          qWhere.pegawaiId = { in: memberIds };
        }
      }
    }

    // Status filter
    if (statusParam) {
      const s = String(statusParam);
      if (s.includes(',')) {
        const statuses = s.split(',').map((st) => st.trim());
        const validStatuses = ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI'];
        const filtered = statuses.filter((st) => validStatuses.includes(st));
        if (filtered.length > 0) qWhere.status = { in: filtered };
      } else {
        if (/^\d+$/.test(s)) {
          const code = Number(s);
          if ([1, 2, 3, 4, 5].includes(code)) qWhere.statusCode = code;
        } else {
          const validStatuses = ['MENUNGGU_PROSES_USER', 'SEDANG_DIPROSES_USER', 'SEDANG_DIPROSES_USER_PAUSED', 'MENUNGGU_REVIEW_PM', 'SELESAI'];
          if (validStatuses.includes(s)) qWhere.status = s;
        }
      }
    }

    // Tasklist type filter
    if (tasklistTypeParam) {
      const validTypes = ['BLUEPRINT', 'DEVELOPMENT', 'MAINTENANCE'];
      if (validTypes.includes(tasklistTypeParam)) qWhere.tasklistType = tasklistTypeParam;
    }

    // BA version filter
    if (baVersionParam) {
      const v = String(baVersionParam).trim();
      if (v) qWhere.baVersion = v;
    }

    // Date range filter
    const makeDateAt = (dateStr: string, endOfDay = false): Date | null => {
      const s = String(dateStr || '').trim();
      if (!s.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    };
    const fromDate = fromParam ? makeDateAt(fromParam, false) : null;
    const toDate = toParam ? makeDateAt(toParam, true) : null;
    if (fromDate && toDate) qWhere.scheduleAt = { gte: fromDate, lte: toDate };
    else if (fromDate) qWhere.scheduleAt = { gte: fromDate };
    else if (toDate) qWhere.scheduleAt = { lte: toDate };

    // Exclude unassigned tasks unless pegawaiId is explicitly set
    if (!pegawaiIdParam && !teamIdParam) {
      if (qWhere.pegawaiId === undefined) {
        qWhere.pegawaiId = { not: null as unknown as number };
      }
    }

    // --- SUPPORT/DEV visibility filter for PM ---
    if (effectiveUserId && where.projectId && typeof where.projectId === 'object' && 'in' in where.projectId) {
      const projectIds = (where.projectId as { in: number[] }).in;

      const supportProjects = await prisma.proyek.findMany({
        where: { id: { in: projectIds }, type: { in: ['SUPPORT', 'DEVELOPMENT'] } },
        select: { id: true, type: true },
      });

      const projectsWithRegion: number[] = [];
      for (const proj of supportProjects) {
        const hasRegionTeam = await prisma.proyekTeam.findFirst({
          where: { projectId: proj.id, teamSource: 'region' },
        });
        if (proj.type === 'SUPPORT' || (proj.type === 'DEVELOPMENT' && hasRegionTeam)) {
          projectsWithRegion.push(proj.id);
        }
      }

      if (projectsWithRegion.length > 0) {
        const inheritedPMProjects = await prisma.proyekTeam.findMany({
          where: { pegawaiId: effectiveUserId, projectId: { in: projectsWithRegion }, teamSource: 'inherited' },
          select: { projectId: true },
        });

        if (inheritedPMProjects.length > 0) {
          const subordinateIds = await prisma.teamHierarchy.findMany({
            where: { projectId: { in: inheritedPMProjects.map((p: any) => p.projectId) }, managerId: effectiveUserId, isActive: true },
            select: { memberId: true },
          });
          const subordinateIdList = subordinateIds.map((s: any) => s.memberId);

          const allTasksInProjects = await prisma.tasklist.findMany({
            where: { projectId: { in: inheritedPMProjects.map((p: any) => p.projectId) } },
            select: { id: true, createdBy: true, pegawaiId: true, projectId: true },
          });

          const taskIdsToExclude: number[] = [];
          for (const task of allTasksInProjects) {
            if (!task.createdBy) continue;
            const creatorRole = await prisma.proyekTeam.findFirst({
              where: { projectId: task.projectId, pegawaiId: task.createdBy },
              select: { jabatan: true, teamSource: true },
            });
            const assigneeRole = task.pegawaiId
              ? await prisma.proyekTeam.findFirst({
                  where: { projectId: task.projectId, pegawaiId: task.pegawaiId },
                  select: { jabatan: true, teamSource: true },
                })
              : null;
            if (creatorRole && assigneeRole) {
              const creatorIsPIC = creatorRole.jabatan.toUpperCase().includes('PIC');
              const creatorIsPM = creatorRole.jabatan.toUpperCase().includes('PM');
              const assigneeIsRegionProgrammer =
                assigneeRole.teamSource === 'region' && assigneeRole.jabatan.toUpperCase().includes('PROGRAMMER');
              if (creatorIsPIC && !creatorIsPM && assigneeIsRegionProgrammer) {
                taskIdsToExclude.push(task.id);
              }
            }
          }

          const explicitPegawaiId = typeof qWhere.pegawaiId === 'number' ? qWhere.pegawaiId : null;
          const managedInheritedProjectIds = inheritedPMProjects.map((p: any) => p.projectId);
          const visibleAssigneeIds = Array.from(new Set([...subordinateIdList, effectiveUserId])).filter(Number.isFinite);

          const visibilityFilter = explicitPegawaiId !== null
            ? { AND: [{ projectId: { in: managedInheritedProjectIds } }, { pegawaiId: explicitPegawaiId }] }
            : {
                OR: [
                  { createdBy: effectiveUserId },
                  { AND: [{ projectId: { in: managedInheritedProjectIds } }, { pegawaiId: { in: visibleAssigneeIds } }] },
                ],
              };

          if (taskIdsToExclude.length > 0) {
            const wrappedFilter = { AND: [visibilityFilter, { id: { notIn: taskIdsToExclude } }] };
            qWhere.AND = qWhere.AND
              ? Array.isArray(qWhere.AND)
                ? [...qWhere.AND, wrappedFilter]
                : [qWhere.AND, wrappedFilter]
              : [wrappedFilter];
          } else {
            qWhere.AND = qWhere.AND
              ? Array.isArray(qWhere.AND)
                ? [...qWhere.AND, visibilityFilter]
                : [qWhere.AND, visibilityFilter]
              : [visibilityFilter];
          }
        }
      }
    }

    // Exclude completed past tasks unless showAll is set
    if (!showAll) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existingNOT = qWhere.NOT && Array.isArray(qWhere.NOT) ? qWhere.NOT : [];
      qWhere.NOT = [...existingNOT, { AND: [{ status: 'SELESAI' }, { scheduleAt: { lt: today } }] }];
    }

    // --- Sorting ---
    const orderBy: any = (() => {
      switch (sortKey) {
        case 'scheduleAt': return { scheduleAt: sortDir };
        case 'proyekNama': return { projectId: sortDir };
        case 'moduleNama': return { moduleId: sortDir };
        case 'pegawaiNama': return { pegawaiId: sortDir };
        case 'status': return { statusCode: sortDir };
        case 'baVersion': return { baVersion: sortDir };
        default: return { createdAt: 'desc' as const };
      }
    })();

    // --- Pagination ---
    let page = pageParam;
    let size = sizeParam;

    // --- Query ---
    const total = await prisma.tasklist.count({ where: qWhere });

    if (showAll) {
      page = 1;
      size = total;
    }

    const rows = await prisma.tasklist.findMany({
      where: qWhere,
      orderBy,
      skip: showAll ? 0 : (page - 1) * size,
      take: showAll ? total : size,
    });

    // --- Enrich data ---
    const projectIdsArr = Array.from(new Set(rows.map((r: any) => r.projectId)));
    const moduleIdsArr = Array.from(new Set(rows.map((r: any) => r.moduleId)));
    const pegawaiIdsArr = Array.from(new Set(rows.map((r: any) => r.pegawaiId).filter((id: any) => id !== null) as number[]));
    const creatorIdsArr = Array.from(new Set(rows.map((r: any) => r.createdBy).filter((id: any) => id !== null) as number[]));
    const allUserIds = Array.from(new Set([...pegawaiIdsArr, ...creatorIdsArr]));

    const [projects, modules, pegawais, proyekTeams, tasklistLogs] = await Promise.all([
      prisma.proyek.findMany({ where: { id: { in: projectIdsArr } } }),
      prisma.proyekModule.findMany({ where: { id: { in: moduleIdsArr } } }),
      prisma.pegawai.findMany({ where: { id: { in: allUserIds } } }),
      prisma.proyekTeam.findMany({ where: { projectId: { in: projectIdsArr }, pegawaiId: { in: allUserIds } } }),
      prisma.tasklistLog.findMany({
        where: { taskId: { in: rows.map((r: any) => r.id) }, action: { in: ['START', 'STATUS_CHANGE'] } },
        orderBy: { waktu: 'asc' },
      }),
    ]);

    // Actual duration from logs
    const mapActualDuration = new Map<number, number>();
    const logsByTask = new Map<number, typeof tasklistLogs>();
    for (const log of tasklistLogs) {
      if (!logsByTask.has(log.taskId)) logsByTask.set(log.taskId, []);
      logsByTask.get(log.taskId)!.push(log);
    }
    for (const [taskId, logs] of logsByTask.entries()) {
      let durationMinutes = 0;
      const startLog = logs.find((l: any) => l.action === 'START');
      const endLog = [...logs].reverse().find((l: any) => l.action === 'STATUS_CHANGE' && l.status === 'SELESAI');
      if (startLog && endLog) {
        const diffMs = endLog.waktu.getTime() - startLog.waktu.getTime();
        if (diffMs > 0) durationMinutes = Math.floor(diffMs / (1000 * 60));
      }
      mapActualDuration.set(taskId, durationMinutes);
    }

    const mapP = new Map(projects.map((p: any) => [p.id, p.namaProyek]));
    const mapM = new Map(modules.map((m: any) => [m.id, m.nama]));
    const mapE = new Map(pegawais.map((e: any) => [e.id, e.namaLengkap]));
    const mapRole = new Map(pegawais.map((e: any) => [e.id, e.role]));
    const mapJabatan = new Map(proyekTeams.map((pt: any) => [`${pt.projectId}-${pt.pegawaiId}`, pt.jabatan]));
    const mapTeamSource = new Map(proyekTeams.map((pt: any) => [`${pt.projectId}-${pt.pegawaiId}`, pt.teamSource]));

    const items = rows.map((r: any) => {
      const sc = r.statusCode ?? statusToCode(r.status);
      const sanitized = sanitizeTasklistData(r);
      const jabatanKey = r.pegawaiId ? `${r.projectId}-${r.pegawaiId}` : null;
      const jabatan = jabatanKey ? mapJabatan.get(jabatanKey) : null;
      const role = r.pegawaiId ? mapRole.get(r.pegawaiId) : null;
      const creatorJabatanKey = r.createdBy ? `${r.projectId}-${r.createdBy}` : null;
      const creatorJabatan = creatorJabatanKey ? mapJabatan.get(creatorJabatanKey) : null;
      const creatorTeamSource = creatorJabatanKey ? mapTeamSource.get(creatorJabatanKey) : null;

      return {
        ...sanitized,
        statusCode: sc,
        statusText: codeToText(sc),
        proyekNama: mapP.get(r.projectId) || '',
        moduleNama: mapM.get(r.moduleId) || '',
        pegawaiNama: r.pegawaiId ? mapE.get(r.pegawaiId) || '' : '',
        pegawaiRole: role || 'PROGRAMMER',
        pegawaiJabatan: jabatan || null,
        creatorJabatan: creatorJabatan || null,
        creatorTeamSource: creatorTeamSource || null,
        scheduleAt: r.scheduleAt,
        calculatedDueDate: r.calculatedDueDate,
        tasklistType: r.tasklistType,
        totalDurationMinutes: r.totalDurationMinutes,
        actualDurationMinutes: mapActualDuration.get(r.id) || 0,
      };
    });

    return NextResponse.json({ items, total, page, size });
  } catch (error: any) {
    console.error('Error fetching tasklist via external API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasklist', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
