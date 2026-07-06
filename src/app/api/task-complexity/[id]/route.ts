import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, SlaType } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/task-complexity/[id] - Get specific task complexity configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const taskComplexity = await prisma.taskComplexity.findUnique({
      where: { id }
    });

    if (!taskComplexity) {
      return NextResponse.json(
        { error: 'Task complexity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(taskComplexity);
  } catch (error) {
    console.error('Error fetching task complexity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task complexity' },
      { status: 500 }
    );
  }
}

// PUT /api/task-complexity/[id] - Update specific task complexity configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { complexity, hours, points, description, isActive } = body;

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

    // Check if task complexity exists
    const existingTaskComplexity = await prisma.taskComplexity.findUnique({
      where: { id }
    });

    if (!existingTaskComplexity) {
      return NextResponse.json(
        { error: 'Task complexity not found' },
        { status: 404 }
      );
    }

    // Update the task complexity
    const updatedTaskComplexity = await prisma.taskComplexity.update({
      where: { id },
      data: {
        complexity: complexity,
        hours: parseFloat(hours),
        points: parseInt(points),
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedTaskComplexity);
  } catch (error) {
    console.error('Error updating task complexity:', error);
    return NextResponse.json(
      { error: 'Failed to update task complexity' },
      { status: 500 }
    );
  }
}

// DELETE /api/task-complexity/[id] - Delete specific task complexity configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check if task complexity exists
    const existingTaskComplexity = await prisma.taskComplexity.findUnique({
      where: { id }
    });

    if (!existingTaskComplexity) {
      return NextResponse.json(
        { error: 'Task complexity not found' },
        { status: 404 }
      );
    }

    // Delete the task complexity
    await prisma.taskComplexity.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Task complexity deleted successfully' });
  } catch (error) {
    console.error('Error deleting task complexity:', error);
    return NextResponse.json(
      { error: 'Failed to delete task complexity' },
      { status: 500 }
    );
  }
}
