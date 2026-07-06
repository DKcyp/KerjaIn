import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/master-sla/[id] - Get specific SLA configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const slaConfig = await prisma.masterSla.findUnique({
      where: { id: parseInt(id) }
    });

    if (!slaConfig) {
      return NextResponse.json(
        { error: 'SLA configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(slaConfig);
  } catch (error) {
    console.error('Error fetching SLA configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SLA configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/master-sla/[id] - Update specific SLA configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assigneeStartTask, assigneeWorkDuration, pmReviewDuration } = body;

    // Validate required fields
    if (!assigneeStartTask || !assigneeWorkDuration || !pmReviewDuration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate durations are positive integers
    if (assigneeStartTask <= 0 || assigneeWorkDuration <= 0 || pmReviewDuration <= 0) {
      return NextResponse.json(
        { error: 'All durations must be positive numbers' },
        { status: 400 }
      );
    }

    const slaConfig = await prisma.masterSla.update({
      where: { id: parseInt(id) },
      data: {
        assigneeStartTask: parseInt(assigneeStartTask),
        assigneeWorkDuration: parseInt(assigneeWorkDuration),
        pmReviewDuration: parseInt(pmReviewDuration),
      },
    });

    return NextResponse.json(slaConfig);
  } catch (error) {
    console.error('Error updating SLA configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update SLA configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/master-sla/[id] - Delete specific SLA configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.masterSla.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: 'SLA configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting SLA configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete SLA configuration' },
      { status: 500 }
    );
  }
}
