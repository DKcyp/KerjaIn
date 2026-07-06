import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/richzlog/manager/tasks/summary
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const managerId = searchParams.get('managerId');
    const apiKey = req.headers.get('x-api-key');

    // Validate API Key
    if (!apiKey || apiKey !== '172dc4710ab54af8b1b405c89d6de9f0') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or missing API key',
          error: { code: 'INVALID_API_KEY' }
        },
        { status: 401 }
      );
    }

    // Validate managerId
    if (!managerId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Manager ID is required',
          error: { code: 'MISSING_MANAGER_ID' }
        },
        { status: 400 }
      );
    }

    const managerIdNum = parseInt(managerId);
    if (isNaN(managerIdNum)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid manager ID',
          error: { code: 'INVALID_MANAGER_ID' }
        },
        { status: 400 }
      );
    }

    // Get team members under this manager
    const teamHierarchy = await prisma.teamHierarchy.findMany({
      where: {
        managerId: managerIdNum,
        isActive: true
      },
      select: {
        memberId: true
      }
    });

    const memberIds = teamHierarchy.map(th => th.memberId);
    const allMemberIds = [managerIdNum, ...memberIds];

    const now = new Date();

    // Get all tasks for the team
    const allTasks = await prisma.tasklist.findMany({
      where: {
        pegawaiId: {
          in: allMemberIds
        }
      },
      select: {
        id: true,
        status: true,
        calculatedDueDate: true
      }
    });

    // Calculate summary
    const total = allTasks.length;
    const todo = allTasks.filter(t => t.status === 'MENUNGGU_PROSES_USER').length;
    const doing = allTasks.filter(t => t.status === 'SEDANG_DIPROSES_USER').length;
    const done = allTasks.filter(t => t.status === 'MENUNGGU_REVIEW_PM' || t.status === 'SELESAI').length;
    const approved = allTasks.filter(t => t.status === 'SELESAI').length;
    const rejected = 0; // Placeholder
    const overdue = allTasks.filter(t => 
      t.calculatedDueDate && 
      t.calculatedDueDate < now && 
      t.status !== 'SELESAI'
    ).length;
    const pendingApproval = allTasks.filter(t => t.status === 'MENUNGGU_REVIEW_PM').length;

    return NextResponse.json({
      success: true,
      message: 'Team task summary retrieved successfully',
      data: {
        total,
        todo,
        doing,
        done,
        approved,
        rejected,
        overdue,
        pendingApproval
      }
    });

  } catch (error) {
    console.error('GET /api/richzlog/manager/tasks/summary error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: {
          code: 'SERVER_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
