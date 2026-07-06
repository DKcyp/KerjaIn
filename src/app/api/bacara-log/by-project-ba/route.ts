import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleCORSPreflight, addCORSHeaders } from '@/lib/cors';

// OPTIONS - Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  const response = handleCORSPreflight(req);
  if (response) return response;
  return new NextResponse(null, { status: 200 });
}

// GET - Get bacara logs by project and BA (sorted oldest to newest)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Required parameters
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');
    const baId = searchParams.get('baId') || searchParams.get('ba_id');

    if (!projectId || !baId) {
      return addCORSHeaders(NextResponse.json(
        {
          success: false,
          error: 'projectId and baId are required',
          message: 'Please provide both projectId and baId parameters'
        },
        { status: 400 }
      ), req.headers.get('origin'));
    }

    const pId = parseInt(projectId);
    const bId = parseInt(baId);

    if (isNaN(pId) || isNaN(bId)) {
      return addCORSHeaders(NextResponse.json(
        {
          success: false,
          error: 'Invalid projectId or baId',
          message: 'projectId and baId must be valid numbers'
        },
        { status: 400 }
      ), req.headers.get('origin'));
    }

    // Get logs with related data
    const logs = await prisma.bacaraLog.findMany({
      where: {
        projectId: pId,
        baId: bId
      },
      include: {
        bacara: {
          select: {
            id: true,
            nama: true,
            version: true,
            type: true,
            status: true,
            project: {
              select: {
                id: true,
                namaProyek: true,
                kodeProyek: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // lama ke terbaru
      },
    });

    return addCORSHeaders(NextResponse.json({
      success: true,
      data: {
        logs,
      }
    }), req.headers.get('origin'));

  } catch (error) {
    console.error('Error fetching bacara logs by project and ba:', error);
    return addCORSHeaders(NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bacara logs',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    ), req.headers.get('origin'));
  }
}
