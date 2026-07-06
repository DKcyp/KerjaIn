import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

/**
 * GET /api/uat-approval
 * Get list of modules/sub-modules for UAT approval
 * Returns modules with their tasklists and approval status
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN, ADMIN, and PM can access UAT approval
    if (!['SUPER_ADMIN', 'ADMIN', 'PM'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') || undefined;

    // Build where clause
    const where: any = {};
    if (projectId) {
      where.projectId = parseInt(projectId);
    }
    if (status) {
      where.status = status;
    }

    // Get all modules with their approval status
    const modules = await prisma.proyekModule.findMany({
      where: projectId ? { projectId: parseInt(projectId) } : {},
      orderBy: [{ projectId: 'asc' }, { order: 'asc' }],
      include: {
        _count: {
          select: {
            tasklist: true,
          },
        },
      },
    });

    // Get all existing approvals
    const approvals = await prisma.uatApproval.findMany({
      where,
      include: {
        approver: {
          select: {
            id: true,
            namaLengkap: true,
          },
        },
        rejecter: {
          select: {
            id: true,
            namaLengkap: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            originalName: true,
            filePath: true,
            fileType: true,
            fileSize: true,
            uploadedAt: true,
          },
        },
      },
    });

    // Get projects
    const projects = await prisma.proyek.findMany({
      select: {
        id: true,
        kodeProyek: true,
        namaProyek: true,
      },
    });

    // Get tasklists count per module
    const tasklists = await prisma.tasklist.findMany({
      where: projectId ? { projectId: parseInt(projectId) } : {},
      select: {
        id: true,
        kode: true,
        keterangan: true,
        status: true,
        moduleId: true,
        projectId: true,
      },
    });

    // Map approvals by moduleId
    const approvalMap = new Map();
    approvals.forEach((approval) => {
      approvalMap.set(approval.moduleId, approval);
    });

    // Build hierarchical structure
    const moduleMap = new Map();
    const rootModules: any[] = [];

    modules.forEach((module) => {
      const tasklist = tasklists.filter((t) => t.moduleId === module.id);
      const approval = approvalMap.get(module.id);

      const moduleData = {
        id: module.id,
        nama: module.nama,
        kode: module.kode,
        projectId: module.projectId,
        parentId: module.parentId,
        depth: module.depth,
        isLeaf: module.isLeaf,
        order: module.order,
        tasklistCount: tasklist.length,
        tasklists: tasklist,
        approval: approval || null,
        children: [],
      };

      moduleMap.set(module.id, moduleData);

      if (!module.parentId) {
        rootModules.push(moduleData);
      }
    });

    // Build tree structure
    modules.forEach((module) => {
      if (module.parentId) {
        const parent = moduleMap.get(module.parentId);
        if (parent) {
          parent.children.push(moduleMap.get(module.id));
        }
      }
    });

    return NextResponse.json({
      modules: rootModules,
      projects,
      approvals,
    });
  } catch (error) {
    console.error('Error fetching UAT approval data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/uat-approval
 * Create or update UAT approval for a module
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN, ADMIN, and PM can approve
    if (!['SUPER_ADMIN', 'ADMIN', 'PM'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { projectId, moduleId, status, notes } = body;

    if (!projectId || !moduleId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if approval already exists
    const existing = await prisma.uatApproval.findUnique({
      where: {
        projectId_moduleId: {
          projectId: parseInt(projectId),
          moduleId: parseInt(moduleId),
        },
      },
    });

    let approval;

    if (existing) {
      // Update existing approval
      const updateData: any = {
        status,
        notes,
        updatedAt: new Date(),
      };

      if (status === 'APPROVED') {
        updateData.approvedBy = user.id;
        updateData.approvedAt = new Date();
        updateData.rejectedBy = null;
        updateData.rejectedAt = null;
      } else if (status === 'REJECTED') {
        updateData.rejectedBy = user.id;
        updateData.rejectedAt = new Date();
        updateData.approvedBy = null;
        updateData.approvedAt = null;
      }

      approval = await prisma.uatApproval.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          approver: {
            select: {
              id: true,
              namaLengkap: true,
            },
          },
          rejecter: {
            select: {
              id: true,
              namaLengkap: true,
            },
          },
          attachments: true,
        },
      });
    } else {
      // Create new approval
      const createData: any = {
        projectId: parseInt(projectId),
        moduleId: parseInt(moduleId),
        status,
        notes,
      };

      if (status === 'APPROVED') {
        createData.approvedBy = user.id;
        createData.approvedAt = new Date();
      } else if (status === 'REJECTED') {
        createData.rejectedBy = user.id;
        createData.rejectedAt = new Date();
      }

      approval = await prisma.uatApproval.create({
        data: createData,
        include: {
          approver: {
            select: {
              id: true,
              namaLengkap: true,
            },
          },
          rejecter: {
            select: {
              id: true,
              namaLengkap: true,
            },
          },
          attachments: true,
        },
      });
    }

    return NextResponse.json({ approval });
  } catch (error) {
    console.error('Error creating/updating UAT approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
