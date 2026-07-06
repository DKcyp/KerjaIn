import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/blueprint-baru/[id]/import-update
 * Update a row in temp tables (when user edits in preview)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, rowId, rowType, updates } = body;

    if (!sessionId || !rowId || !rowType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    if (rowType === 'task') {
      // Update task in temp table
      const { taskName, programmerId, jadwalMulai, kompleksitas, durasi } = updates;
      
      await prisma.$executeRaw`
        UPDATE blueprint_tasklist_temp 
        SET nama_task = ${taskName},
            programmer_id = ${programmerId ? parseInt(programmerId) : null},
            jadwal_mulai = ${jadwalMulai ? new Date(jadwalMulai) : null},
            kompleksitas = ${kompleksitas},
            durasi = ${durasi ? parseFloat(durasi) : 0},
            is_edited = TRUE
        WHERE id = ${rowId} AND import_session_id = ${sessionId}
      `;
    } else if (rowType === 'module') {
      // Update module in temp table
      const { moduleName } = updates;
      
      await prisma.$executeRaw`
        UPDATE blueprint_module_temp 
        SET nama = ${moduleName},
            is_edited = TRUE
        WHERE id = ${rowId} AND import_session_id = ${sessionId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Data updated successfully'
    });

  } catch (error) {
    console.error('Error updating preview data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
