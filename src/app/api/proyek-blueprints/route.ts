import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/proyek-blueprints - List all projects with their blueprint status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Build where clause for proyek
    const where: any = {};
    
    if (search) {
      where.OR = [
        { kodeProyek: { contains: search, mode: 'insensitive' } },
        { namaProyek: { contains: search, mode: 'insensitive' } },
        { client: { contains: search, mode: 'insensitive' } },
        { pic: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get all projects with their blueprint information
    const projects = await prisma.proyek.findMany({
      where,
      include: {
        blueprints: {
          select: {
            id: true,
            blueprintStatus: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                documents: true,
                requirements: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform the data to match the expected format
    let transformedProjects = projects.map(project => {
      const blueprint = project.blueprints[0]; // Each project should have max 1 blueprint
      
      return {
        id: project.id,
        projectId: project.kodeProyek,
        projectName: project.namaProyek,
        client: project.client || '',
        pic: project.pic || '',
        blueprintStatus: blueprint?.blueprintStatus || null,
        blueprintId: blueprint?.id || null,
        createdAt: blueprint?.createdAt || project.createdAt,
        updatedAt: blueprint?.updatedAt || project.updatedAt,
        _count: blueprint?._count || { documents: 0, requirements: 0 },
        hasBlueprint: !!blueprint
      };
    });

    // Apply status filter after transformation
    if (status && status !== 'ALL') {
      if (status === 'NO_BLUEPRINT') {
        transformedProjects = transformedProjects.filter(p => !p.hasBlueprint);
      } else {
        transformedProjects = transformedProjects.filter(p => p.blueprintStatus === status);
      }
    }

    return NextResponse.json({
      success: true,
      data: transformedProjects
    });

  } catch (error) {
    console.error('Error fetching projects with blueprints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/proyek-blueprints - Create new blueprint for a project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proyekId, createdBy } = body;

    // Validate required fields
    if (!proyekId || !createdBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: proyekId and createdBy' },
        { status: 400 }
      );
    }

    // Check if proyek exists
    const proyek = await prisma.proyek.findUnique({
      where: { id: proyekId }
    });

    if (!proyek) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if blueprint already exists for this project
    const existingBlueprint = await prisma.blueprint.findFirst({
      where: { proyekId }
    });

    if (existingBlueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint already exists for this project' },
        { status: 409 }
      );
    }

    const blueprint = await prisma.blueprint.create({
      data: {
        proyekId,
        createdBy,
        activityLog: {
          create: {
            userId: createdBy,
            action: 'CREATE',
            description: 'Blueprint created',
            notes: 'Initial blueprint creation'
          }
        }
      },
      include: {
        proyek: true,
        documents: true,
        requirements: true,
        activityLog: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: blueprint
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create blueprint' },
      { status: 500 }
    );
  }
}
