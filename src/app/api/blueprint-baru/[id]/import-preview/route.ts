import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

type ValidationError = {
  field: string;
  message: string;
};

type ParsedRow = {
  mainModule: string;
  subModule: string;
  taskName: string;
  originalRowNumber: number;
};

/**
 * POST /api/blueprint-baru/[id]/import-preview
 * Upload and parse Excel/CSV, store in temp tables, return preview data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { baInfo, rows } = body;

    // Validate input
    if (!baInfo?.nama || !baInfo?.version) {
      return NextResponse.json({
        success: false,
        error: 'Nama dan Versi Berita Acara wajib diisi'
      }, { status: 400 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Data modul/task tidak ditemukan'
      }, { status: 400 });
    }

    // Generate unique session ID
    const sessionId = randomUUID();
    const userId = session.id;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Insert BA info to temp table
        const baResult = await tx.$queryRaw<Array<{ id: number }>>`
          INSERT INTO blueprint_temp 
          (import_session_id, import_user_id, proyek_id, nama, version, deskripsi, type, original_row_number)
          VALUES (${sessionId}, ${Number(userId)}, ${projectId}, ${baInfo.nama}, ${baInfo.version}, ${baInfo.deskripsi || ''}, ${baInfo.type || 'BLUEPRINT'}, 2)
          RETURNING id
        `;

        const blueprintTempId = baResult[0].id;

        // 3. Process rows and build module hierarchy
        const moduleMap = new Map<string, number>(); // mainModuleName -> module_temp_id
        const processedRows: any[] = [];

        for (const row of rows as ParsedRow[]) {
          const errors: ValidationError[] = [];
          let mainModuleTempId: number | null = null;
          let subModuleTempId: number | null = null;

          // Validate main module
          if (!row.mainModule || row.mainModule.trim() === '') {
            errors.push({ field: 'mainModule', message: 'Modul Utama wajib diisi' });
          }

          // Get or create main module
          if (row.mainModule && row.mainModule.trim() !== '') {
            const mainModuleName = row.mainModule.trim();
            
            if (moduleMap.has(mainModuleName)) {
              mainModuleTempId = moduleMap.get(mainModuleName)!;
            } else {
              // Create new main module
              const moduleResult = await tx.$queryRaw<Array<{ id: number }>>`
                INSERT INTO blueprint_module_temp 
                (import_session_id, blueprint_temp_id, nama, level, original_row_number, validation_errors)
                VALUES (${sessionId}, ${blueprintTempId}, ${mainModuleName}, 1, ${row.originalRowNumber}, CAST(${JSON.stringify([])} AS jsonb))
                RETURNING id
              `;
              mainModuleTempId = moduleResult[0].id;
              moduleMap.set(mainModuleName, mainModuleTempId);
            }
          }

          // Create sub module if specified
          if (row.subModule && row.subModule.trim() !== '' && mainModuleTempId) {
            const subModuleName = row.subModule.trim();
            const subModuleResult = await tx.$queryRaw<Array<{ id: number }>>`
              INSERT INTO blueprint_module_temp 
              (import_session_id, blueprint_temp_id, nama, parent_id, level, original_row_number, validation_errors)
              VALUES (${sessionId}, ${blueprintTempId}, ${subModuleName}, ${mainModuleTempId}, 2, ${row.originalRowNumber}, CAST(${JSON.stringify([])} AS jsonb))
              RETURNING id
            `;
            subModuleTempId = subModuleResult[0].id;
          }

          // Create task if specified
          if (row.taskName && row.taskName.trim() !== '') {
            const targetModuleId = subModuleTempId || mainModuleTempId;
            
            if (!targetModuleId) {
              errors.push({ field: 'module', message: 'Module tidak valid' });
            }

            // Insert task (no programmer required on import)
            if (targetModuleId) {
              await tx.$queryRaw`
                INSERT INTO blueprint_tasklist_temp 
                (import_session_id, module_temp_id, nama_task, programmer_id, kompleksitas, original_row_number, validation_errors)
                VALUES (${sessionId}, ${targetModuleId}, ${row.taskName.trim()}, NULL, ${'MEDIUM'}, ${row.originalRowNumber}, CAST(${JSON.stringify(errors)} AS jsonb))
              `;
            }
          }

          processedRows.push({
            ...row,
            errors,
            hasErrors: errors.length > 0
          });
        }

        // 4. Fetch preview data
        const previewData = await fetchPreviewData(tx, sessionId);

        return {
          sessionId,
          ...previewData
        };
      });

      return NextResponse.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error in import preview:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * GET /api/blueprint-baru/[id]/import-preview?sessionId=xxx
 * Get preview data from temp tables
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required'
      }, { status: 400 });
    }

    const previewData = await fetchPreviewData(prisma, sessionId);
    
    return NextResponse.json({
      success: true,
      data: previewData
    });

  } catch (error) {
    console.error('Error fetching preview:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * Helper function to fetch preview data from temp tables
 */
async function fetchPreviewData(tx: any, sessionId: string) {
  // Get BA info
  const baResult = await tx.$queryRaw<Array<any>>`
    SELECT * FROM blueprint_temp WHERE import_session_id = ${sessionId}
  `;

  if (baResult.length === 0) {
    throw new Error('Session not found');
  }

  const baInfo = baResult[0];

  // Get all modules
  const modulesResult = await tx.$queryRaw<Array<any>>`
    SELECT * FROM blueprint_module_temp 
    WHERE import_session_id = ${sessionId}
    ORDER BY level, id
  `;

  // Get all tasks with programmer info
  const tasksResult = await tx.$queryRaw<Array<any>>`
    SELECT 
      t.*,
      p."namaLengkap" as programmer_name
    FROM blueprint_tasklist_temp t
    LEFT JOIN pegawai p ON t.programmer_id = p.id
    WHERE t.import_session_id = ${sessionId}
    ORDER BY t.id
  `;

  // Build hierarchical structure
  const rows: any[] = [];
  const mainModules = modulesResult.filter((m: any) => m.level === 1);

  for (const mainModule of mainModules) {
    // Add main module row
    rows.push({
      id: `main_${mainModule.id}`,
      type: 'main',
      mainModule: mainModule.nama,
      subModule: '-----',
      taskName: '-----',
      jadwalMulai: '',
      kompleksitas: 'MEDIUM',
      durasi: 0,
      originalRowNumber: mainModule.original_row_number,
      validationErrors: mainModule.validation_errors || [],
      isEdited: mainModule.is_edited,
      tempId: mainModule.id
    });

    // Get sub modules for this main module
    const subModules = modulesResult.filter((m: any) => m.parent_id === mainModule.id);

    for (const subModule of subModules) {
      // Get tasks for this sub module
      const tasks = tasksResult.filter((t: any) => t.module_temp_id === subModule.id);

      if (tasks.length === 0) {
        // Sub module without tasks
        rows.push({
          id: `sub_${subModule.id}`,
          type: 'sub',
          mainModule: '├───',
          subModule: subModule.nama,
          taskName: '',
          jadwalMulai: '',
          kompleksitas: 'MEDIUM',
          durasi: 0,
          originalRowNumber: subModule.original_row_number,
          validationErrors: subModule.validation_errors || [],
          isEdited: subModule.is_edited,
          parentMainModuleId: `main_${mainModule.id}`,
          tempId: subModule.id,
          moduleTempId: subModule.id
        });
      } else {
        // Sub module with tasks
        tasks.forEach((task: any, index: number) => {
          rows.push({
            id: `task_${task.id}`,
            type: 'sub',
            mainModule: '├───',
            subModule: index === 0 ? subModule.nama : '',
            taskName: task.nama_task,
            jadwalMulai: task.jadwal_mulai || '',
            kompleksitas: task.kompleksitas,
            durasi: task.durasi || 0,
            originalRowNumber: task.original_row_number,
            validationErrors: task.validation_errors || [],
            isEdited: task.is_edited,
            parentMainModuleId: `main_${mainModule.id}`,
            tempId: task.id,
            taskTempId: task.id,
            moduleTempId: subModule.id
          });
        });
      }
    }

    // Get tasks directly under main module (no sub module)
    const directTasks = tasksResult.filter((t: any) => t.module_temp_id === mainModule.id);
    directTasks.forEach((task: any) => {
      rows.push({
        id: `direct_task_${task.id}`,
        type: 'sub',
        mainModule: '├───',
        subModule: '',
        taskName: task.nama_task,
        jadwalMulai: task.jadwal_mulai || '',
        kompleksitas: task.kompleksitas,
        durasi: task.durasi || 0,
        originalRowNumber: task.original_row_number,
        validationErrors: task.validation_errors || [],
        isEdited: task.is_edited,
        parentMainModuleId: `main_${mainModule.id}`,
        tempId: task.id,
        taskTempId: task.id,
        moduleTempId: mainModule.id
      });
    });
  }

  return {
    baInfo: {
      nama: baInfo.nama,
      version: baInfo.version,
      deskripsi: baInfo.deskripsi
    },
    rows
  };
}

/**
 * PATCH /api/blueprint-baru/[id]/import-preview
 * Update programmer in temp table
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const { sessionId, taskName, programmerId } = body;

    if (!sessionId || !taskName || !programmerId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Update programmer_id in temp table
    await prisma.$executeRaw`
      UPDATE blueprint_tasklist_temp 
      SET programmer_id = ${programmerId}
      WHERE import_session_id = ${sessionId} AND nama_task = ${taskName}
    `;

    return NextResponse.json({
      success: true,
      message: 'Programmer updated successfully'
    });

  } catch (error) {
    console.error('Error updating programmer:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
