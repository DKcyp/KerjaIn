import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logBacaraActivity, extractRequestInfo } from '@/lib/bacaraLogger';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENGAJUAN'],
  PENGAJUAN: ['REVIEW'],
  REVIEW: ['RFC', 'CED'],
  RFC: ['PENGAJUAN'],
  CED: ['DEVELOPMENT'],
  DEVELOPMENT: ['PROSES_DEVELOPMENT'],
  PROSES_DEVELOPMENT: ['UAT_INTERNAL'],
  UAT_INTERNAL: [],
  UAT_INTERNAL_SELESAI: ['UAT_EXTERNAL'],
  UAT_EXTERNAL: [],
  UAT_EXTERNAL_SELESAI: ['SELESAI'],
  SELESAI: []
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(request);

  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const body = await request.json();
    const { baId, status } = body;

    if (!baId || !status) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/ba/status`,
        httpMethod: 'PUT',
        ...requestInfo,
        requestParams: body,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'Missing parameters',
        errorCode: 'VALIDATION_ERROR',
        projectId,
        baId: baId ? parseInt(baId) : undefined,
        actionType: 'UPDATE_BA_STATUS',
        actionDescription: 'Perubahan status Blueprint gagal karena data yang diperlukan belum lengkap',
        userId: 1,
      });

      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const ba = await prisma.bacara.findUnique({ where: { id: baId } });
    if (!ba) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/ba/status`,
        httpMethod: 'PUT',
        ...requestInfo,
        requestParams: body,
        responseStatusCode: 404,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: 'BA not found',
        errorCode: 'NOT_FOUND',
        projectId,
        baId: parseInt(baId),
        actionType: 'UPDATE_BA_STATUS',
        actionDescription: 'Perubahan status Blueprint gagal karena data BA tidak ditemukan',
        userId: 1,
      });

      return NextResponse.json({ success: false, error: 'BA not found' }, { status: 404 });
    }

    const currentStatus = ba.status as string;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      const responseTime = Date.now() - startTime;
      await logBacaraActivity({
        endpoint: `/api/blueprint-baru/${id}/ba/status`,
        httpMethod: 'PUT',
        ...requestInfo,
        requestParams: body,
        responseStatusCode: 400,
        responseTimeMs: responseTime,
        isError: true,
        errorMessage: `Cannot transition from ${currentStatus} to ${status}`,
        errorCode: 'INVALID_TRANSITION',
        projectId: ba.projectId,
        baId: ba.id,
        actionType: 'UPDATE_BA_STATUS',
        actionDescription: `Perubahan status Blueprint dari ${currentStatus} ke ${status} tidak diizinkan`,
        oldStatusBa: currentStatus,
        newStatusBa: status,
        userId: 1,
      });

      return NextResponse.json({
        success: false,
        error: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${allowedTransitions.join(', ')}`
      }, { status: 400 });
    }

    await prisma.bacara.update({
      where: { id: baId },
      data: {
        status,
        // Increment rfcCount when status changes to RFC
        // rfc_count is VARCHAR in DB, so we handle increment manually via raw SQL
        ...(status === 'RFC' ? {
          rfcCount: {
            set: String((parseInt((await prisma.bacara.findUnique({ where: { id: baId }, select: { rfcCount: true } }))?.rfcCount || '0') || 0) + 1)
          }
        } : {}),
        // Update submittedAt when status changes to PENGAJUAN
        ...(status === 'PENGAJUAN' ? { submittedAt: new Date() } : {})
      }
    });

    const responseTime = Date.now() - startTime;

    // Log to bacara_log
    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${id}/ba/status`,
      httpMethod: 'PUT',
      ...requestInfo,
      requestParams: body,
      responseStatusCode: 200,
      responseTimeMs: responseTime,
      isError: false,
      projectId: ba.projectId,
      baId: ba.id,
      actionType: 'UPDATE_BA_STATUS',
      actionDescription: `Status Blueprint "${ba.nama}" berhasil diubah dari ${currentStatus} menjadi ${status}`,
      oldStatusBa: currentStatus,
      newStatusBa: status,
      statusBa: status,
      userId: 1,
    });

    return NextResponse.json({
      success: true,
      message: `Status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating BA status:', error);
    const responseTime = Date.now() - startTime;

    await logBacaraActivity({
      endpoint: `/api/blueprint-baru/${request.url}`,
      httpMethod: 'PUT',
      ...requestInfo,
      responseStatusCode: 500,
      responseTimeMs: responseTime,
      isError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'INTERNAL_ERROR',
      actionType: 'UPDATE_BA_STATUS',
      actionDescription: 'Perubahan status Blueprint gagal karena terjadi kesalahan pada sistem',
      userId: 1,
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
