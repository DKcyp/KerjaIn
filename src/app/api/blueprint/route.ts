import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

// GET /api/blueprint - List all blueprints (auto-create for projects without blueprints)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // First, get projects where the current user is a team member
    const userProjects = await prisma.proyekTeam.findMany({
      where: {
        pegawaiId: user.id
      },
      select: {
        projectId: true
      }
    });

    const userProjectIds = userProjects.map(pt => pt.projectId);

    // If user is not in any project team, return empty result
    if (userProjectIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Find projects without blueprints (only for user's projects)
    const projectsWithoutBlueprints = await prisma.proyek.findMany({
      where: {
        id: { in: userProjectIds },
        blueprints: {
          none: {}
        }
      }
    });

    // Create blueprints for projects that don't have them
    if (projectsWithoutBlueprints.length > 0) {
      await Promise.all(
        projectsWithoutBlueprints.map(project =>
          prisma.blueprint.create({
            data: {
              proyekId: project.id,
              createdBy: 1, // System created
              blueprintStatus: 'DRAFT',
              activityLog: {
                create: {
                  userId: 1,
                  action: 'CREATE',
                  description: 'Blueprint auto-created for project',
                  notes: `Auto-created blueprint for project ${project.kodeProyek}`
                }
              }
            }
          })
        )
      );
    }

    // Build where clause for filtering (only user's projects)
    const where: any = {
      proyekId: { in: userProjectIds }
    };
    
    if (search) {
      where.OR = [
        { proyek: { kodeProyek: { contains: search, mode: 'insensitive' } } },
        { proyek: { namaProyek: { contains: search, mode: 'insensitive' } } },
        { proyek: { client: { contains: search, mode: 'insensitive' } } },
        { proyek: { pic: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (status && status !== 'ALL') {
      where.blueprintStatus = status;
    }

    // Now get blueprints for user's projects only
    const blueprints = await prisma.blueprint.findMany({
      where,
      select: {
        id: true,
        proyekId: true,
        proyek: {
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true,
            client: true,
            pic: true
          }
        },
        blueprintStatus: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: true,
            requirements: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform the data to match the expected format
    const transformedBlueprints = blueprints.map(blueprint => ({
      id: blueprint.proyek.id, // Use proyek ID for consistency
      blueprintId: blueprint.id, // Blueprint ID for navigation
      projectId: blueprint.proyek.kodeProyek,
      projectName: blueprint.proyek.namaProyek,
      client: blueprint.proyek.client || '',
      pic: blueprint.proyek.pic || '',
      blueprintStatus: blueprint.blueprintStatus,
      createdAt: blueprint.createdAt,
      updatedAt: blueprint.updatedAt,
      _count: blueprint._count
    }));

    return NextResponse.json({
      success: true,
      data: transformedBlueprints
    });

  } catch (error) {
    console.error('Error fetching blueprints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blueprints' },
      { status: 500 }
    );
  }
}

// POST /api/blueprint - Create new blueprint
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
