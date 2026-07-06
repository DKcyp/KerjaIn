import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getGitHubToken } from "@/lib/github-auth";

/**
 * GET /api/github/branches/[repo]
 * Get all branches for a repository
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ repo: string }> }
) {
    try {
        const { user } = await getServerSession();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { repo: encodedRepo } = await params;
        const repo = decodeURIComponent(encodedRepo);

        console.log('[GET /api/github/branches] Fetching branches for:', repo);

        const { token } = await getGitHubToken();

        // Fetch branches from GitHub API
        const response = await fetch(
            `https://api.github.com/repos/${repo}/branches?per_page=100`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[GET /api/github/branches] GitHub API error:', errorData);
            return NextResponse.json(
                { error: errorData.message || "Failed to fetch branches" },
                { status: response.status }
            );
        }

        const branches = await response.json();

        console.log(`[GET /api/github/branches] Found ${branches.length} branches`);

        return NextResponse.json({
            success: true,
            branches: branches.map((b: any) => ({
                name: b.name,
                sha: b.commit.sha,
                protected: b.protected
            }))
        });

    } catch (error: any) {
        console.error("[GET /api/github/branches] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch branches" },
            { status: 500 }
        );
    }
}
