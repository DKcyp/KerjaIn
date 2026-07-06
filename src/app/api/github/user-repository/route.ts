import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getUserProjectIds } from "@/lib/githubPermissions";
import { prisma } from "@/lib/prisma";

/**
 * Get the first repository mapped to user's projects
 * Used to redirect PM to their repository instead of dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getServerSession();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Super Admin doesn't need redirect
    if (user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ repositoryName: null });
    }

    // Get user's project IDs
    const projectIds = await getUserProjectIds(user.id);
    
    if (projectIds.length === 0) {
      return NextResponse.json({ repositoryName: null });
    }

    // Get first repository mapped to user's projects
    const repo = await (prisma as any).gitHubRepository.findFirst({
      where: {
        projectId: { in: projectIds },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!repo) {
      return NextResponse.json({ repositoryName: null });
    }

    return NextResponse.json({
      repositoryName: repo.repositoryName,
      repositoryFullName: repo.repositoryFullName,
    });
  } catch (error: any) {
    console.error("Error getting user repository:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get user repository" },
      { status: 500 }
    );
  }
}
