import { NextRequest, NextResponse } from 'next/server';
import { parseSessionFromCookieHeader } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/blueprint-baru/[id]/import-preview/update-module
 * Update module in temp table (for existing module selection or new module name)
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

    const body = await request.json();
    const { sessionId, moduleTempId, moduleName, existingModuleId, isNewModule, level } = body;

    if (!sessionId || !moduleTempId || !moduleName) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Update module in temp table
    await prisma.$executeRaw`
      UPDATE blueprint_module_temp 
      SET 
        nama = ${moduleName},
        existing_module_id = ${existingModuleId},
        is_new_module = ${isNewModule},
        is_edited = TRUE
      WHERE import_session_id = ${sessionId} AND id = ${moduleTempId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Module updated successfully'
    });

  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
