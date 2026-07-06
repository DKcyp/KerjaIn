import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { mapRepositoryToProject } from "@/lib/githubPermissions";
import { prisma } from "@/lib/prisma";

// GET: Get all repository mappings or get by projectId
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // If projectId is provided, get mapping for that project
    if (projectId) {
      const mapping = await (prisma as any).gitHubRepository.findUnique({
        where: { projectId: parseInt(projectId) },
      });

      if (!mapping) {
        return NextResponse.json({ repositoryName: null });
      }

      return NextResponse.json({
        repositoryName: mapping.repositoryName,
        repositoryFullName: mapping.repositoryFullName,
      });
    }

    console.log('[API /api/github/repository-mapping] User:', user.role);

    // Only Super Admin can view all mappings
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: "Only Super Admin can view repository mappings" },
        { status: 403 }
      );
    }

    const mappings = await (prisma as any).gitHubRepository.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('[API /api/github/repository-mapping] Found mappings:', mappings.length);

    // Manually fetch project data for each mapping
    const mappingsWithProjects = await Promise.all(
      mappings.map(async (mapping: any) => {
        const project = await prisma.proyek.findUnique({
          where: { id: mapping.projectId },
          select: {
            id: true,
            kodeProyek: true,
            namaProyek: true,
          },
        });
        
        return {
          ...mapping,
          project,
        };
      })
    );

    return NextResponse.json({ mappings: mappingsWithProjects });
  } catch (error: any) {
    console.error("[API /api/github/repository-mapping] Error fetching repository mappings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch repository mappings" },
      { status: 500 }
    );
  }
}

// POST: Create or update repository mapping
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, repositoryName, repositoryFullName } = body;

    console.log('[POST /api/github/repository-mapping] Request:', {
      userId: user.id,
      userRole: user.role,
      projectId,
      repositoryName,
      repositoryFullName
    });

    if (!projectId || !repositoryName || !repositoryFullName) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.proyek.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check permission: Super Admin can map any project, PM can only map their own projects
    console.log('[POST /api/github/repository-mapping] Checking permissions:', {
      userRole: user.role,
      isSuperAdmin: user.role === 'SUPER_ADMIN',
      projectId
    });

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'PM') {
      console.log('[POST /api/github/repository-mapping] User is not SUPER_ADMIN or PM, checking team membership...');
      // For non-PM/non-admin users, check if they're in the project team
      const teamMember = await prisma.proyekTeam.findFirst({
        where: {
          projectId,
          pegawaiId: user.id,
        },
      });

      console.log('[POST /api/github/repository-mapping] Team member check:', {
        found: !!teamMember,
        teamMember,
        searchCriteria: {
          projectId,
          pegawaiId: user.id,
        }
      });

      if (!teamMember) {
        console.log('[POST /api/github/repository-mapping] Permission denied - user is not in project team');
        return NextResponse.json(
          { error: "You can only map repositories for projects you are part of" },
          { status: 403 }
        );
      }
      console.log('[POST /api/github/repository-mapping] User is in project team, allowing mapping');
    } else if (user.role === 'PM') {
      console.log('[POST /api/github/repository-mapping] User is PM, allowing mapping');
    } else {
      console.log('[POST /api/github/repository-mapping] User is SUPER_ADMIN, allowing mapping');
    }

    // Map repository to project
    console.log('[POST /api/github/repository-mapping] Calling mapRepositoryToProject...');
    await mapRepositoryToProject(projectId, repositoryName, repositoryFullName);
    console.log('[POST /api/github/repository-mapping] Successfully mapped repository');

    return NextResponse.json({
      success: true,
      message: "Repository mapped successfully",
    });
  } catch (error: any) {
    console.error("[POST /api/github/repository-mapping] Error mapping repository:", error);
    return NextResponse.json(
      { error: error.message || "Failed to map repository" },
      { status: 500 }
    );
  }
}

// DELETE: Remove repository mapping
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only Super Admin and PM can manage mappings
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'PM') {
      return NextResponse.json(
        { error: "Only Super Admin or PM can manage repository mappings" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const repositoryName = searchParams.get("repositoryName");
    const projectId = searchParams.get("projectId");

    // Support delete by either repositoryName or projectId
    if (!repositoryName && !projectId) {
      return NextResponse.json(
        { error: "Repository name or project ID is required" },
        { status: 400 }
      );
    }

    if (projectId) {
      // Delete by projectId
      const mapping = await (prisma as any).gitHubRepository.findUnique({
        where: { projectId: parseInt(projectId) },
      });

      if (mapping) {
        await (prisma as any).gitHubRepository.delete({
          where: { projectId: parseInt(projectId) },
        });
      }
    } else if (repositoryName) {
      // Delete by repositoryName
      await (prisma as any).gitHubRepository.delete({
        where: { repositoryName },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Repository mapping removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing repository mapping:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove repository mapping" },
      { status: 500 }
    );
  }
}
