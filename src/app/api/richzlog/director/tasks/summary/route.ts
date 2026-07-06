import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/richzlog/director/tasks/summary
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const directorId = searchParams.get('directorId');
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

    // Validate directorId
    if (!directorId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Director ID is required',
          error: { code: 'MISSING_DIRECTOR_ID' }
        },
        { status: 400 }
      );
    }

    const directorIdNum = parseInt(directorId);
    if (isNaN(directorIdNum)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid director ID',
          error: { code: 'INVALID_DIRECTOR_ID' }
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Get all tasks (director can see everything)
    const allTasks = await prisma.tasklist.findMany({
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
      message: 'All tasks summary retrieved successfully',
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
    console.error('GET /api/richzlog/director/tasks/summary error:', error);
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
