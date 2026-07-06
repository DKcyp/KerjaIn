import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/blueprint-baru/[id]/import-confirm
 * Confirm import: Move data from temp tables to final tables and cleanup
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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required'
      }, { status: 400 });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Get BA info from temp
        const baResult = await tx.$queryRaw<Array<any>>`
          SELECT * FROM blueprint_temp WHERE import_session_id = ${sessionId}
        `;

        if (baResult.length === 0) {
          throw new Error('Session not found');
        }

        const baTempData = baResult[0];

        // 2. Check if BA already exists
        const existingBA = await tx.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM business_analyst 
          WHERE "projectId" = ${projectId} AND nama = ${baTempData.nama} AND version = ${baTempData.version}
        `;

        let baId: number;

        if (existingBA.length > 0) {
          // BA exists, use existing ID
          baId = existingBA[0].id;
          
          // Update deskripsi if provided
          if (baTempData.deskripsi) {
            await tx.$executeRaw`
              UPDATE business_analyst SET deskripsi = ${baTempData.deskripsi} WHERE id = ${baId}
            `;
          }
        } else {
          // Create new BA with all required fields
          const newBA = await tx.$queryRaw<Array<{ id: number }>>`
            INSERT INTO business_analyst 
            ("projectId", nama, version, deskripsi, status, type, "createdAt", "updatedAt")
            VALUES (
              ${projectId}, 
              ${baTempData.nama}, 
              ${baTempData.version}, 
              ${baTempData.deskripsi || ''}, 
              'DRAFT'::"BAStatus",
              ${baTempData.type}::"BAType",
              NOW(),
              NOW()
            )
            RETURNING id
          `;
          baId = newBA[0].id;
        }

        // 3. Get all modules from temp
        const modulesResult = await tx.$queryRaw<Array<any>>`
          SELECT * FROM blueprint_module_temp 
          WHERE import_session_id = ${sessionId}
          ORDER BY level, id
        `;

        // 4. Get all tasks from temp
        const tasksResult = await tx.$queryRaw<Array<any>>`
          SELECT * FROM blueprint_tasklist_temp 
          WHERE import_session_id = ${sessionId}
        `;

        // 5. Create module mapping (temp_id -> final_id)
        const moduleMapping = new Map<number, number>();

        // Process main modules first (level 1)
        const mainModules = modulesResult.filter(m => m.level === 1);
        
        for (const tempModule of mainModules) {
          let finalModuleId: number;

          // Check if using existing module
          if (tempModule.existing_module_id && !tempModule.is_new_module) {
            // Reuse existing module
            finalModuleId = tempModule.existing_module_id;
            console.log(`Reusing existing main module: ${tempModule.nama} (ID: ${finalModuleId})`);
          } else {
            // Create new main module
            // Generate kode
            const kodeResult = await tx.$queryRaw<Array<{ next_num: number }>>`
              SELECT COALESCE(MAX(CAST(SUBSTRING(kode FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_num
              FROM ba_module 
              WHERE ba_id = ${baId} AND level = 1
            `;
            const nextNum = kodeResult[0].next_num;
            const kode = `M${String(nextNum).padStart(3, '0')}`;

            // Insert main module
            const moduleResult = await tx.$queryRaw<Array<{ id: number }>>`
              INSERT INTO ba_module 
              (project_id, ba_id, kode, nama, level, is_app_module, created_at, updated_at)
              VALUES (${projectId}, ${baId}, ${kode}, ${tempModule.nama}, 1, false, NOW(), NOW())
              RETURNING id
            `;
            finalModuleId = moduleResult[0].id;
            console.log(`Created new main module: ${tempModule.nama} (ID: ${finalModuleId})`);
          }

          moduleMapping.set(tempModule.id, finalModuleId);
        }

        // Process sub modules (level 2)
        const subModules = modulesResult.filter(m => m.level === 2);
        
        for (const tempModule of subModules) {
          const parentFinalId = moduleMapping.get(tempModule.parent_id);
          
          if (!parentFinalId) {
            console.error(`Parent module not found for temp module ${tempModule.id}`);
            continue;
          }

          let finalModuleId: number;

          // Check if using existing sub module
          if (tempModule.existing_module_id && !tempModule.is_new_module) {
            // Reuse existing sub module
            finalModuleId = tempModule.existing_module_id;
            console.log(`Reusing existing sub module: ${tempModule.nama} (ID: ${finalModuleId})`);
          } else {
            // Create new sub module
            // Generate kode
            const kodeResult = await tx.$queryRaw<Array<{ next_num: number }>>`
              SELECT COALESCE(MAX(CAST(SUBSTRING(kode FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_num
              FROM ba_module 
              WHERE ba_id = ${baId} AND parent_id = ${parentFinalId}
            `;
            const nextNum = kodeResult[0].next_num;
            const parentKode = await tx.$queryRaw<Array<{ kode: string }>>`
              SELECT kode FROM ba_module WHERE id = ${parentFinalId}
            `;
            const kode = `${parentKode[0].kode}.${String(nextNum).padStart(3, '0')}`;

            // Insert sub module
            const moduleResult = await tx.$queryRaw<Array<{ id: number }>>`
              INSERT INTO ba_module 
              (project_id, ba_id, kode, nama, parent_id, level, is_app_module, created_at, updated_at)
              VALUES (${projectId}, ${baId}, ${kode}, ${tempModule.nama}, ${parentFinalId}, 2, false, NOW(), NOW())
              RETURNING id
            `;
            finalModuleId = moduleResult[0].id;
            console.log(`Created new sub module: ${tempModule.nama} (ID: ${finalModuleId})`);
          }

          moduleMapping.set(tempModule.id, finalModuleId);
        }

        // 6. Insert tasks
        for (const tempTask of tasksResult) {
          const moduleFinalId = moduleMapping.get(tempTask.module_temp_id);
          
          if (!moduleFinalId) {
            console.error(`Module not found for temp task ${tempTask.id}`);
            continue;
          }

          await tx.$executeRaw`
            INSERT INTO ba_task 
            (project_id, module_id, nama, deskripsi, jadwal_mulai, kompleksitas, created_at, updated_at)
            VALUES (
              ${projectId},
              ${moduleFinalId},
              ${tempTask.nama_task},
              ${tempTask.deskripsi || ''},
              ${tempTask.jadwal_mulai},
              ${tempTask.kompleksitas},
              NOW(),
              NOW()
            )
          `;
        }

        // 7. Cleanup temp tables
        await tx.$executeRaw`
          DELETE FROM blueprint_tasklist_temp WHERE import_session_id = ${sessionId}
        `;
        await tx.$executeRaw`
          DELETE FROM blueprint_module_temp WHERE import_session_id = ${sessionId}
        `;
        await tx.$executeRaw`
          DELETE FROM blueprint_temp WHERE import_session_id = ${sessionId}
        `;

        return {
          baId,
          modulesCreated: moduleMapping.size,
          tasksCreated: tasksResult.length
        };
      });

      return NextResponse.json({
        success: true,
        message: 'Blueprint berhasil diimport',
        data: result
      });

    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error confirming import:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/blueprint-baru/[id]/import-confirm?sessionId=xxx
 * Cancel import: Delete temp data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID required'
      }, { status: 400 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Delete temp data
        await tx.$executeRaw`
          DELETE FROM blueprint_tasklist_temp WHERE import_session_id = ${sessionId}
        `;
        await tx.$executeRaw`
          DELETE FROM blueprint_module_temp WHERE import_session_id = ${sessionId}
        `;
        await tx.$executeRaw`
          DELETE FROM blueprint_temp WHERE import_session_id = ${sessionId}
        `;
      });

      return NextResponse.json({
        success: true,
        message: 'Import cancelled'
      });

    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Error cancelling import:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
