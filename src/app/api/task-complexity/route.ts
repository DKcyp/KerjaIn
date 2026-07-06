import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, SlaType } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/task-complexity - Get all task complexity configurations
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const complexities = await prisma.taskComplexity.findMany({
      orderBy: {
        complexity: 'asc'
      }
    });

    return NextResponse.json({ items: complexities });
  } catch (error) {
    console.error('Error fetching task complexities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task complexities' },
      { status: 500 }
    );
  }
}

// POST /api/task-complexity - Create or update task complexity configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { complexity, hours, points, description } = body;

    // Validate required fields
    if (!complexity || hours === undefined || points === undefined) {
      return NextResponse.json(
        { error: 'Complexity, hours, and points are required' },
        { status: 400 }
      );
    }

    // Validate complexity type
    if (!Object.values(SlaType).includes(complexity)) {
      return NextResponse.json(
        { error: 'Invalid complexity type. Must be EASY, MEDIUM, or HARD' },
        { status: 400 }
      );
    }

    // Validate hours and points are positive numbers
    if (hours <= 0 || points <= 0) {
      return NextResponse.json(
        { error: 'Hours and points must be positive numbers' },
        { status: 400 }
      );
    }

    // Upsert (create or update) the task complexity
    const taskComplexity = await prisma.taskComplexity.upsert({
      where: {
        complexity: complexity
      },
      update: {
        hours: parseFloat(hours),
        points: parseInt(points),
        description: description || null,
        updatedAt: new Date()
      },
      create: {
        complexity: complexity,
        hours: parseFloat(hours),
        points: parseInt(points),
        description: description || null
      }
    });

    return NextResponse.json(taskComplexity, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating task complexity:', error);
    return NextResponse.json(
      { error: 'Failed to create/update task complexity' },
      { status: 500 }
    );
  }
}
