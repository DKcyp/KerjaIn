import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Get bacara log statistics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Filter parameters
    const projectId = searchParams.get('projectId');
    const baId = searchParams.get('baId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause safely parsing integers
    const where: any = {};
    const pId = projectId ? parseInt(projectId) : NaN;
    if (!isNaN(pId)) where.projectId = pId;
    
    const bId = baId ? parseInt(baId) : NaN;
    if (!isNaN(bId)) where.baId = bId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get statistics
    const [
      totalLogs,
      totalErrors,
      totalSuccess,
      actionTypeStats,
      httpMethodStats,
      statusBaStats,
      avgResponseTime,
      recentErrors,
      topUsers,
    ] = await Promise.all([
      // Total logs
      prisma.bacaraLog.count({ where }),
      
      // Total errors
      prisma.bacaraLog.count({ where: { ...where, isError: true } }),
      
      // Total success
      prisma.bacaraLog.count({ where: { ...where, isError: false } }),
      
      // Group by action type
      prisma.bacaraLog.groupBy({
        by: ['actionType'],
        where,
        _count: { actionType: true },
        orderBy: { _count: { actionType: 'desc' } },
      }),
      
      // Group by HTTP method
      prisma.bacaraLog.groupBy({
        by: ['httpMethod'],
        where,
        _count: { httpMethod: true },
        orderBy: { _count: { httpMethod: 'desc' } },
      }),
      
      // Group by BA status
      prisma.bacaraLog.groupBy({
        by: ['statusBa'],
        where: { ...where, statusBa: { not: null } },
        _count: { statusBa: true },
        orderBy: { _count: { statusBa: 'desc' } },
      }),
      
      // Average response time
      prisma.bacaraLog.aggregate({
        where: { ...where, responseTimeMs: { not: null } },
        _avg: { responseTimeMs: true },
        _max: { responseTimeMs: true },
        _min: { responseTimeMs: true },
      }),
      
      // Recent errors (last 10)
      prisma.bacaraLog.findMany({
        where: { ...where, isError: true },
        select: {
          id: true,
          endpoint: true,
          errorMessage: true,
          errorCode: true,
          createdAt: true,
          actionType: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      
      // Top users by activity
      prisma.bacaraLog.groupBy({
        by: ['userId', 'userName'],
        where: { ...where, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    // Calculate error rate
    const errorRate = totalLogs > 0 ? ((totalErrors / totalLogs) * 100).toFixed(2) : '0.00';

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalLogs,
          totalErrors,
          totalSuccess,
          errorRate: `${errorRate}%`,
        },
        performance: {
          avgResponseTimeMs: avgResponseTime._avg.responseTimeMs 
            ? Math.round(avgResponseTime._avg.responseTimeMs) 
            : null,
          maxResponseTimeMs: avgResponseTime._max.responseTimeMs,
          minResponseTimeMs: avgResponseTime._min.responseTimeMs,
        },
        actionTypes: actionTypeStats.map(stat => ({
          actionType: stat.actionType,
          count: stat._count.actionType,
        })),
        httpMethods: httpMethodStats.map(stat => ({
          method: stat.httpMethod,
          count: stat._count.httpMethod,
        })),
        statusDistribution: statusBaStats.map(stat => ({
          status: stat.statusBa,
          count: stat._count.statusBa,
        })),
        recentErrors,
        topUsers: topUsers.map(user => ({
          userId: user.userId,
          userName: user.userName,
          activityCount: user._count.userId,
        })),
      }
    });

  } catch (error) {
    console.error('Error fetching bacara log statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
