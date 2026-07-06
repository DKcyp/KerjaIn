import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * External API for retrieving CRM tasks by ticket ID
 * GET /api/external/crm/tasks?ticketId=TICKET-123
 * 
 * Authentication: API key via X-API-Key header
 * Returns tasks linked to the specified ticket ID
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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({
        error: 'Missing required parameter',
        message: 'ticketId parameter is required',
        usage: 'GET /api/external/crm/tasks?ticketId=TICKET-123'
      }, { status: 400 });
    }

    console.log(`External CRM tasks API called for ticketId: ${ticketId}`);

    // Search for tasks with the specified ticket ID
    const tasks = await prisma.$queryRaw`
      SELECT 
        t.*,
        p."kodeProyek" as "projectCode",
        p."namaProyek" as "projectName",
        pm.kode as "moduleCode",
        pm.nama as "moduleName",
        peg.username,
        peg."namaLengkap" as "assigneeName"
      FROM tasklist t
      LEFT JOIN proyek p ON t."projectId" = p.id
      LEFT JOIN proyek_module pm ON t."moduleId" = pm.id
      LEFT JOIN pegawai peg ON t."pegawaiId" = peg.id
      WHERE t.ticket_id = ${ticketId}
      ORDER BY t."createdAt" DESC
    `;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tasks found for the specified ticket ID',
        ticketId: ticketId,
        totalTasks: 0,
        tasks: []
      });
    }

    // Format the response
    const formattedTasks = (tasks as any[]).map(task => ({
      taskId: task.id,
      taskCode: task.kode,
      projectCode: task.projectCode,
      projectName: task.projectName,
      moduleCode: task.moduleCode,
      moduleName: task.moduleName,
      assignee: {
        username: task.username,
        name: task.assigneeName
      },
      scheduleAt: task.scheduleAt?.toISOString() || null,
      dueDate: task.dueDate?.toISOString() || null,
      description: task.keterangan,
      status: task.status,
      complexity: task.taskComplexity,
      tasklistType: task.tasklistType,
      slaDeadlines: {
        startTaskBy: task.assigneeStartTaskDeadline?.toISOString() || null,
        completeWorkBy: task.assigneeWorkDeadline?.toISOString() || null,
        reviewBy: task.pmReviewDeadline?.toISOString() || null
      },
      ticketId: task.ticket_id,
      ticketUrl: task.ticket_url,
      crmId: task.id_crm,
      createdAt: task.createdAt?.toISOString() || null,
      updatedAt: task.updatedAt?.toISOString() || null
    }));

    return NextResponse.json({
      success: true,
      message: 'Tasks retrieved successfully',
      ticketId: ticketId,
      totalTasks: formattedTasks.length,
      tasks: formattedTasks
    });

  } catch (error) {
    console.error('External CRM tasks API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to retrieve CRM tasks'
      }, 
      { status: 500 }
    );
  }
}

// POST method for documentation
export async function POST(request: NextRequest) {
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
    message: 'External CRM Tasks Retrieval API',
    version: '1.0.0',
    description: 'API for retrieving tasks linked to CRM tickets',
    authentication: 'API Key via X-API-Key header',
    endpoints: {
      'GET /api/external/crm/tasks?ticketId=TICKET-123': {
        description: 'Retrieve all tasks linked to a specific ticket ID',
        authentication: 'Required',
        parameters: {
          ticketId: 'string (required) - The ticket ID to search for'
        },
        response: {
          success: 'boolean',
          message: 'string',
          ticketId: 'string - The searched ticket ID',
          totalTasks: 'number - Number of tasks found',
          tasks: 'array of task objects with full details'
        }
      }
    },
    features: [
      'API key authentication',
      'Ticket ID search',
      'Complete task details',
      'Project and assignee information',
      'SLA deadline information',
      'CRM linking data'
    ],
    usage: {
      curl: 'curl -H "X-API-Key: your-api-key" "http://localhost:3001/api/external/crm/tasks?ticketId=TICKET-123"',
      headers: {
        'X-API-Key': 'Your CRM API key'
      }
    },
    taskDataStructure: {
      taskId: 'Task ID in database',
      taskCode: 'Generated task code (e.g., "01 - 1")',
      projectCode: 'Project code',
      projectName: 'Project name',
      moduleCode: 'Module code',
      moduleName: 'Module name',
      assignee: 'Object with username and name',
      scheduleAt: 'ISO date when task is scheduled',
      dueDate: 'ISO date when task is due',
      description: 'Task description',
      status: 'Current task status',
      complexity: 'Task complexity (EASY/MEDIUM/HARD)',
      slaDeadlines: 'Object with SLA deadline dates',
      ticketId: 'CRM ticket ID',
      ticketUrl: 'URL to ticket in CRM system',
      crmId: 'CRM record ID',
      createdAt: 'Task creation timestamp',
      updatedAt: 'Last update timestamp'
    }
  });
}
