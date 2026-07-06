import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get single bacara log by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logId = parseInt(id);

    if (isNaN(logId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid log ID'
        },
        { status: 400 }
      );
    }

    const log = await prisma.bacaraLog.findUnique({
      where: { id: logId },
      include: {
        bacara: {
          select: {
            id: true,
            nama: true,
            version: true,
            type: true,
            status: true,
            deskripsi: true,
            createdAt: true,
            updatedAt: true,
            project: {
              select: {
                id: true,
                namaProyek: true,
                kodeProyek: true,
                client: true,
                pic: true,
              }
            },
            baModules: {
              select: {
                id: true,
                nama: true,
                level: true,
              }
            }
          }
        }
      }
    });

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: 'Log not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: log
    });

  } catch (error) {
    console.error('Error fetching bacara log:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bacara log',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
