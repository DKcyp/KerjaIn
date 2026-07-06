import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateTasklistKode } from '@/lib/generateKode';
// import { sendWhatsAppMessage } from '@/lib/whatsappService';

// Temporary inline WhatsApp function until TypeScript server restarts
async function sendWhatsAppMessage(phoneNumber: string | null, message: string, type?: string): Promise<boolean> {
  try {
    if (!phoneNumber) return false;
    
    let normalized = String(phoneNumber).replace(/[^0-9+]/g, '');
    if (normalized.startsWith('+')) normalized = normalized.slice(1);
    if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
    if (!/^\d{7,18}$/.test(normalized)) return false;
    
    const response = await fetch('https://wa.expressa.id/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: normalized, message })
    });
    
    return response.ok;
  } catch (error) {
    console.error('[WhatsApp] Error:', error);
    return false;
  }
}

/**
 * External API for creating tasklists linked to CRM tickets
 * POST /api/external/crm/tasklist
 * 
 * Authentication: API key via X-API-Key header
 * Creates tasklist with CRM ticket reference and automatic PM notification
 */

// Validate API key
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const expectedKey = process.env.CRM_API_KEY;
  
  if (!expectedKey) {
    console.error('CRM_API_KEY not configured');
    return false;
  }
  
  return apiKey === expectedKey;
}

// Ensure id_crm column exists on tasklist (runtime-safe)
async function ensureTasklistIdCrmColumn() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS id_crm TEXT NULL;`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS ticket_id TEXT NULL;`
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE public.tasklist ADD COLUMN IF NOT EXISTS ticket_url TEXT NULL;`
    );
  } catch (e) {
    console.error('ensureTasklistIdCrmColumn failed (non-fatal)', e);
  }
}

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
        action TEXT NOT NULL
      );`
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_tasklist_log_task_waktu ON public.tasklist_log ("taskId", waktu DESC);`);
  } catch {
    // ignore non-fatal
  }
}

const codeToStatus = (code: number | null | undefined): any => {
  switch (code) {
    case 1: return 'MENUNGGU_PROSES_USER';
    case 2: return 'SEDANG_DIPROSES_USER';
    case 3: return 'MENUNGGU_REVIEW_PM';
    case 4: return 'SELESAI';
    default: return 'MENUNGGU_PROSES_USER';
  }
};

// Get complexity hours based on priority level
function getComplexityHours(complexity: string): number {
  switch (complexity?.toUpperCase()) {
    case 'EASY': return 2;
    case 'MEDIUM': return 8;
    case 'HARD': return 24;
    default: return 8; // Default to MEDIUM
  }
}

// Convert priority to valid SlaType enum
function normalizeComplexity(priority: string): string {
  switch (priority?.toUpperCase()) {
    case 'EASY': return 'EASY';
    case 'MEDIUM': return 'MEDIUM';
    case 'HARD': return 'HARD';
    default: return 'MEDIUM'; // Default to MEDIUM
  }
}

// Calculate SLA deadlines based on complexity
function calculateSLADeadlines(scheduleDate: Date, complexityHours: number) {
  const startDeadline = new Date(scheduleDate);
  startDeadline.setMinutes(startDeadline.getMinutes() + (complexityHours <= 2 ? 30 : complexityHours <= 8 ? 60 : 120));
  
  const workDeadline = new Date(scheduleDate);
  workDeadline.setHours(workDeadline.getHours() + complexityHours);
  
  const reviewDeadline = new Date(workDeadline);
  reviewDeadline.setHours(reviewDeadline.getHours() + (complexityHours <= 2 ? 1 : complexityHours <= 8 ? 2 : 4));
  
  return {
    assigneeStartTaskDeadline: startDeadline,
    assigneeWorkDeadline: workDeadline,
    pmReviewDeadline: reviewDeadline
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: 'Valid API key required in X-API-Key header' 
        }, 
        { status: 401 }
      );
    }

    console.log('External CRM tasklist API called');

    let body: any;
    let imageFile: File | null = null;
    
    // Check if request is multipart/form-data (for image upload)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        
        // Extract JSON data from form field
        const jsonData = formData.get('data');
        if (jsonData && typeof jsonData === 'string') {
          body = JSON.parse(jsonData);
        } else {
          // Extract individual fields from form data
          body = {};
          for (const [key, value] of formData.entries()) {
            if (key !== 'image' && typeof value === 'string') {
              body[key] = value;
            }
          }
        }
        
        // Extract image file
        const image = formData.get('image');
        if (image && image instanceof File) {
          imageFile = image;
        }
      } catch (e) {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
      }
    } else {
      // Handle JSON request
      try { 
        body = await request.json(); 
      } catch { 
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); 
      }
    }

    // Validate required fields
    const {
      projectCode,
      moduleCode,
      assigneeUsername,
      scheduleAt,
      description,
      ticketId,
      ticketUrl,
      crmId,
      priority = 'MEDIUM',
      tasklistType = 'DEVELOPMENT'
    } = body;

    if (!projectCode || !moduleCode || !assigneeUsername || !scheduleAt) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'projectCode, moduleCode, assigneeUsername, and scheduleAt are required',
        required: ['projectCode', 'moduleCode', 'assigneeUsername', 'scheduleAt']
      }, { status: 400 });
    }

    // Parse and validate schedule date
    let scheduleDate: Date;
    try {
      scheduleDate = new Date(scheduleAt);
      if (isNaN(scheduleDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch {
      return NextResponse.json({
        error: 'Invalid date format',
        message: 'scheduleAt must be a valid ISO date string'
      }, { status: 400 });
    }

    // Find project by code
    const project = await prisma.proyek.findFirst({
      where: { kodeProyek: { equals: projectCode, mode: 'insensitive' } }
    });

    if (!project) {
      return NextResponse.json({
        error: 'Project not found',
        message: `Project with code '${projectCode}' does not exist`
      }, { status: 404 });
    }

    // Find module by code within project
    const module = await prisma.proyekModule.findFirst({
      where: { 
        projectId: project.id, 
        kode: { equals: moduleCode, mode: 'insensitive' }
      }
    });

    if (!module) {
      return NextResponse.json({
        error: 'Module not found',
        message: `Module with code '${moduleCode}' not found in project '${projectCode}'`
      }, { status: 404 });
    }

    // Find assignee by username
    const assignee = await prisma.pegawai.findFirst({
      where: { username: { equals: assigneeUsername, mode: 'insensitive' } }
    });

    if (!assignee) {
      return NextResponse.json({
        error: 'Assignee not found',
        message: `User with username '${assigneeUsername}' does not exist`
      }, { status: 404 });
    }

    // Verify assignee is part of project team
    const teamMember = await prisma.proyekTeam.findFirst({
      where: { 
        projectId: project.id, 
        pegawaiId: assignee.id 
      }
    });

    if (!teamMember) {
      return NextResponse.json({
        error: 'User not in project team',
        message: `User '${assigneeUsername}' is not assigned to project '${projectCode}'`
      }, { status: 403 });
    }

    // Generate task code
    let modulePath: string;
    if (module.kode && typeof module.kode === 'string' && module.kode.trim()) {
      modulePath = module.kode.trim();
    } else {
      const parts: string[] = [];
      let cur: typeof module | null = module as any;
      while (cur) {
        parts.push(String(cur.order).padStart(2, '0'));
        if (cur.parentId == null) break;
        cur = await prisma.proyekModule.findUnique({ where: { id: cur.parentId } });
      }
      modulePath = parts.reverse().join('.');
    }

    const taskCode = await generateTasklistKode(prisma);

    // Calculate SLA deadlines and due date based on task complexity
    const complexityHours = getComplexityHours(priority);
    const normalizedComplexity = normalizeComplexity(priority);
    const slaDeadlines = calculateSLADeadlines(scheduleDate, complexityHours);
    
    // Calculate due date (schedule + complexity hours)
    const dueDate = new Date(scheduleDate);
    dueDate.setHours(dueDate.getHours() + complexityHours);

    // Handle image upload if provided
    let imagePath: string | null = null;
    if (imageFile) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const extension = imageFile.name.split('.').pop() || 'jpg';
        const filename = `${timestamp}_${taskCode.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
        const fullPath = path.join(uploadDir, filename);
        
        // Save file
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        fs.writeFileSync(fullPath, buffer);
        
        // Store relative path for database
        imagePath = `/uploads/tasklist/${filename}`;
        
        console.log(`[CRM] Image uploaded: ${imagePath}`);
      } catch (e) {
        console.error('[CRM] Image upload failed (non-fatal):', e);
        // Continue without image if upload fails
      }
    }

    // Ensure CRM columns exist
    await ensureTasklistIdCrmColumn();

    // Create tasklist with SLA deadlines
    const createdTask = await (prisma.tasklist as any).create({
      data: {
        projectId: project.id,
        moduleId: module.id,
        pegawaiId: assignee.id,
        scheduleAt: scheduleDate,
        calculatedDueDate: dueDate,
        keterangan: description || null,
        imagePath: imagePath,
        kode: taskCode,
        statusCode: 1,
        status: codeToStatus(1),
        tasklistType: tasklistType,
        taskComplexity: normalizedComplexity,
        // SLA deadlines based on complexity
        assigneeStartTaskDeadline: slaDeadlines.assigneeStartTaskDeadline,
        assigneeWorkDeadline: slaDeadlines.assigneeWorkDeadline,
        pmReviewDeadline: slaDeadlines.pmReviewDeadline
      }
    });

    // Set CRM/ticket references
    // Use ticketId as the primary CRM identifier (maps to idCrm/id_crm in schema)
    try {
      // Priority: ticketId > crmId for the main id_crm field
      const primaryCrmId = ticketId || crmId;
      if (primaryCrmId) {
        await prisma.$executeRaw`UPDATE public.tasklist SET id_crm = ${String(primaryCrmId)} WHERE id = ${createdTask.id}`;
        console.log(`[CRM] Set id_crm = ${primaryCrmId} for task ${createdTask.id}`);
      }
      if (ticketUrl) {
        await prisma.$executeRaw`UPDATE public.tasklist SET ticket_url = ${String(ticketUrl)} WHERE id = ${createdTask.id}`;
      }
    } catch (e) {
      console.error('Setting CRM/ticket references failed (non-fatal)', e);
    }

    // Log creation
    try {
      await ensureLogTable();
      await prisma.$executeRaw`INSERT INTO public.tasklist_log ("taskId", waktu, "userId", keterangan, status, action)
        VALUES (${createdTask.id}, NOW(), ${assignee.id}, ${'Tasklist created from CRM/ticket'}, ${createdTask.status}, 'CREATE')`;
    } catch (e) {
      console.error('TasklistLog insert failed', e);
    }

    // Send WhatsApp notification to assignee (same format as regular task creation)
    try {
      const getTimeOfDay = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'pagi';
        if (hour >= 12 && hour < 15) return 'siang';
        if (hour >= 15 && hour < 18) return 'sore';
        return 'malam';
      };

      const greet = `Selamat ${getTimeOfDay()} ${assignee.namaLengkap},`;
      const kode = `Kode: ${taskCode}`;
      const modul = `Modul: ${modulePath} - ${module.nama || 'Module'}`;
      const ket = `Keterangan: ${description || '-'}`;
      const pesan = `Task dijadwalkan pada ${scheduleDate.toLocaleDateString('id-ID')}. Anda ditugaskan untuk task ini.`;
      
      const message = [greet, kode, modul, ket, '', `*${pesan}*`, '', `_(Pesan otomatis dari logbook)_`].join('\n');

      await sendWhatsAppMessage(assignee.noHp, message, 'TASK_ASSIGNMENT');
    } catch (e) {
      console.error('WhatsApp notification failed (non-fatal)', e);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'CRM tasklist created successfully',
      data: {
        taskId: createdTask.id,
        taskCode: taskCode,
        projectCode: project.kodeProyek,
        projectName: project.namaProyek,
        moduleCode: module.kode,
        assignee: {
          username: assignee.username,
          name: assignee.namaLengkap
        },
        scheduleAt: scheduleDate.toISOString(),
        calculatedDueDate: dueDate.toISOString(),
        description: description || null,
        imagePath: imagePath,
        status: createdTask.status,
        complexity: priority,
        complexityHours: complexityHours,
        slaDeadlines: {
          startTaskBy: slaDeadlines.assigneeStartTaskDeadline.toISOString(),
          completeWorkBy: slaDeadlines.assigneeWorkDeadline.toISOString(),
          reviewBy: slaDeadlines.pmReviewDeadline.toISOString()
        },
        idCrm: ticketId || crmId || null, // Primary CRM identifier saved to id_crm column
        ticketId: ticketId || null,
        crmId: crmId || null,
        ticketUrl: ticketUrl || null,
        createdAt: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('External CRM tasklist API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to create CRM tasklist'
      }, 
      { status: 500 }
    );
  }
}

// GET method for documentation
export async function GET(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { 
        error: 'Unauthorized', 
        message: 'Valid API key required in X-API-Key header' 
      }, 
      { status: 401 }
    );
  }

  return NextResponse.json({
    message: 'External CRM Tasklist API',
    version: '1.0.0',
    description: 'API for creating tasklists linked to CRM tickets from external systems',
    authentication: 'API Key via X-API-Key header',
    endpoints: {
      'POST /api/external/crm/tasklist': {
        description: 'Create a new tasklist linked to CRM ticket',
        authentication: 'Required',
        requestBody: {
          projectCode: 'string (required) - Project code',
          moduleCode: 'string (required) - Module code within project',
          assigneeUsername: 'string (required) - Username of task assignee',
          scheduleAt: 'string (required) - ISO date string for task schedule',
          description: 'string (optional) - Task description',
          ticketId: 'string (optional) - CRM/Support ticket ID',
          ticketUrl: 'string (optional) - URL to ticket in CRM system',
          crmId: 'string (optional) - CRM record ID',
          priority: 'string (optional) - EASY|MEDIUM|HARD (default: MEDIUM)',
          tasklistType: 'string (optional) - BLUEPRINT|DEVELOPMENT|MAINTENANCE (default: DEVELOPMENT)',
          image: 'file (optional) - Task image attachment (multipart/form-data)'
        },
        response: {
          success: 'boolean',
          message: 'string',
          data: 'object with task details'
        }
      }
    },
    features: [
      'API key authentication',
      'Project and module validation',
      'Team membership verification',
      'Automatic task code generation',
      'CRM/ticket linking',
      'WhatsApp notifications',
      'Activity logging'
    ],
    usage: {
      jsonRequest: 'curl -X POST -H "X-API-Key: your-api-key" -H "Content-Type: application/json" -d \'{"projectCode":"PRJ-001","moduleCode":"01.01","assigneeUsername":"developer1","scheduleAt":"2024-10-23T10:00:00.000Z","ticketId":"TICKET-123"}\' http://localhost:3001/api/external/crm/tasklist',
      multipartRequest: 'curl -X POST -H "X-API-Key: your-api-key" -F "projectCode=PRJ-001" -F "moduleCode=01.01" -F "assigneeUsername=developer1" -F "scheduleAt=2024-10-23T10:00:00.000Z" -F "ticketId=TICKET-123" -F "image=@screenshot.png" http://localhost:3001/api/external/crm/tasklist',
      headers: {
        'X-API-Key': 'Your CRM API key',
        'Content-Type': 'application/json OR multipart/form-data (for image uploads)'
      }
    }
  });
}
