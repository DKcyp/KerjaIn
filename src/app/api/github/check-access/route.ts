import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { canDiscoverRepository } from "@/lib/githubPermissions";

/**
 * Check if user has access to a specific repository
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

    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");

    if (!repo) {
      return NextResponse.json(
        { error: "Repository name is required" },
        { status: 400 }
      );
    }

    console.log('[GET /api/github/check-access] Checking access:', {
      userId: user.id,
      userRole: user.role,
      repo
    });

    // Check if user can discover (view) this repository
    const hasAccess = await canDiscoverRepository(user.id, user.role, repo);

    console.log('[GET /api/github/check-access] Access check result:', {
      hasAccess,
      repo
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      hasAccess: true,
      repository: repo
    });
  } catch (error: any) {
    console.error("[GET /api/github/check-access] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check access" },
      { status: 500 }
    );
  }
}
