import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get bacara logs with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Required parameters
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');
    const baId = searchParams.get('baId') || searchParams.get('ba_id');

    // Validate required parameters - at least one of projectId or baId must be provided
    if (!projectId && !baId) {
      return NextResponse.json(
        {
          success: false,
          error: 'projectId or baId is required',
          message: 'Please provide at least one filter: projectId or baId'
        },
        { status: 400 }
      );
    }

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Optional filter parameters
    const statusBa = searchParams.get('statusBa') || searchParams.get('status_ba');
    const moduleId = searchParams.get('moduleId');
    const taskId = searchParams.get('taskId');
    const userId = searchParams.get('userId');
    const actionType = searchParams.get('actionType');
    const isError = searchParams.get('isError');
    const httpMethod = searchParams.get('httpMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); // Search in endpoint, actionDescription, errorMessage

    // Build where clause
    const where: any = {};

    // Safely parse required filters
    const pId = projectId ? parseInt(projectId) : NaN;
    if (!isNaN(pId)) where.projectId = pId;

    const bId = baId ? parseInt(baId) : NaN;
    if (!isNaN(bId)) where.baId = bId;

    // Optional filters
    if (statusBa) where.statusBa = { equals: statusBa, mode: 'insensitive' };

    const mId = moduleId ? parseInt(moduleId) : NaN;
    if (!isNaN(mId)) where.moduleId = mId;

    const tId = taskId ? parseInt(taskId) : NaN;
    if (!isNaN(tId)) where.taskId = tId;

    const uId = userId ? parseInt(userId) : NaN;
    if (!isNaN(uId)) where.userId = uId;
    if (actionType) where.actionType = actionType;
    if (isError) where.isError = isError === 'true';
    if (httpMethod) where.httpMethod = httpMethod.toUpperCase();

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      where.OR = [
        { endpoint: { contains: search, mode: 'insensitive' } },
        { actionDescription: { contains: search, mode: 'insensitive' } },
        { errorMessage: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.bacaraLog.count({ where });

    // Get logs with related data
    const logs = await prisma.bacaraLog.findMany({
      where,
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
        createdAt: 'desc'
      },
      skip,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching bacara logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bacara logs',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
