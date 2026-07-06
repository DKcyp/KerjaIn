import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromCookieHeader } from '@/lib/auth';

// GET /api/go-live - Get all go-live projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');

    // Build where clause
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (projectId) {
      whereClause.projectId = parseInt(projectId);
    }

    const goLiveProjects = await prisma.goLive.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true,
            client: true,
            pic: true,
          }
        },
        creator: {
          select: {
            id: true,
            namaLengkap: true,
          }
        },
        checklists: {
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            checklists: true,
            activityLogs: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data
    const transformedData = goLiveProjects.map((gl: any) => {
      const completedChecklists = gl.checklists.filter((c: any) => c.isCompleted).length;
      const totalChecklists = gl.checklists.length;

      return {
        id: gl.id,
        projectId: gl.projectId,
        kodeProyek: gl.project.kodeProyek,
        projectName: gl.project.namaProyek,
        client: gl.project.client,
        pic: gl.project.pic,
        status: gl.status,
        scheduledDate: gl.scheduledDate?.toISOString(),
        actualGoLiveDate: gl.actualGoLiveDate?.toISOString(),
        notes: gl.notes,
        createdBy: gl.creator.namaLengkap,
        completedChecklists,
        totalChecklists,
        createdAt: gl.createdAt.toISOString(),
        updatedAt: gl.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching go-live projects:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch go-live projects'
    }, { status: 500 });
  }
}

// POST /api/go-live - Create new go-live entry (auto-create for projects with 100% EUT)
export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, scheduledDate, notes } = body;

    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 });
    }

    // Check if project exists
    const project = await prisma.proyek.findUnique({
      where: { id: parseInt(projectId) }
    });

    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    // Check if go-live already exists for this project
    const existingGoLive = await prisma.goLive.findUnique({
      where: { projectId: parseInt(projectId) }
    });

    if (existingGoLive) {
      return NextResponse.json({
        success: false,
        error: 'Go-Live already exists for this project'
      }, { status: 409 });
    }

    // Verify 100% EUT completion
    const eutTests = await prisma.eutTest.findMany({
      where: { projectId: parseInt(projectId) }
    });

    if (eutTests.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Project has no EUT tests'
      }, { status: 400 });
    }

    const approvedEut = eutTests.filter(t => t.status === 'Approved').length;
    const completionRate = Math.round((approvedEut / eutTests.length) * 100);

    if (completionRate < 100) {
      return NextResponse.json({
        success: false,
        error: `Project EUT is only ${completionRate}% complete. Must be 100% to create Go-Live.`
      }, { status: 400 });
    }

    // Create go-live entry
    const goLive = await prisma.goLive.create({
      data: {
        projectId: parseInt(projectId),
        status: 'READY',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes,
        createdBy: session.id,
      },
      include: {
        project: true,
        creator: {
          select: {
            namaLengkap: true
          }
        }
      }
    });

    // Create default checklists
    const defaultChecklists = [
      { title: 'Server', description: 'Server setup and configuration completed', order: 1 },
      { title: 'Domain', description: 'Domain and DNS configuration completed', order: 2 },
    ];

    await prisma.goLiveChecklist.createMany({
      data: defaultChecklists.map(checklist => ({
        goLiveId: goLive.id,
        ...checklist,
      }))
    });

    // Create activity log
    await prisma.goLiveActivityLog.create({
      data: {
        goLiveId: goLive.id,
        userId: session.id,
        action: 'CREATED',
        description: 'Go-Live entry created',
        notes: 'Project is ready for deployment'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: goLive.id,
        projectId: goLive.projectId,
        kodeProyek: goLive.project.kodeProyek,
        projectName: goLive.project.namaProyek,
        status: goLive.status,
        scheduledDate: goLive.scheduledDate?.toISOString(),
        createdBy: goLive.creator.namaLengkap,
      }
    });

  } catch (error) {
    console.error('Error creating go-live:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create go-live'
    }, { status: 500 });
  }
}
