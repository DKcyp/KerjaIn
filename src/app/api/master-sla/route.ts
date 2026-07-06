import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, SlaType } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/master-sla - Get all SLA configurations
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slaConfigs = await prisma.masterSla.findMany({
      orderBy: {
        slaType: 'asc'
      }
    });

    return NextResponse.json(slaConfigs);
  } catch (error) {
    console.error('Error fetching SLA configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SLA configurations' },
      { status: 500 }
    );
  }
}

// POST /api/master-sla - Create or update SLA configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slaType, assigneeStartTask, assigneeWorkDuration, pmReviewDuration } = body;

    // Validate required fields
    if (!slaType || !assigneeStartTask || !assigneeWorkDuration || !pmReviewDuration) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate SLA type
    if (!Object.values(SlaType).includes(slaType)) {
      return NextResponse.json(
        { error: 'Invalid SLA type' },
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

    // Use upsert to create or update
    const slaConfig = await prisma.masterSla.upsert({
      where: { slaType },
      update: {
        assigneeStartTask: parseInt(assigneeStartTask),
        assigneeWorkDuration: parseInt(assigneeWorkDuration),
        pmReviewDuration: parseInt(pmReviewDuration),
      },
      create: {
        slaType,
        assigneeStartTask: parseInt(assigneeStartTask),
        assigneeWorkDuration: parseInt(assigneeWorkDuration),
        pmReviewDuration: parseInt(pmReviewDuration),
      },
    });

    return NextResponse.json(slaConfig, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating SLA configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save SLA configuration' },
      { status: 500 }
    );
  }
}
