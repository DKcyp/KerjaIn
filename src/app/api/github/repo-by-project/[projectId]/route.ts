import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/github/repo-by-project/[projectId]
 * Get GitHub repository info for a project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const { user } = await getServerSession();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { projectId: projectIdStr } = await params;
        const projectId = parseInt(projectIdStr);

        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: "Invalid project ID" },
                { status: 400 }
            );
        }

        const repository = await prisma.gitHubRepository.findUnique({
            where: { projectId }
        });

        if (!repository) {
            return NextResponse.json(
                { error: "Repository not found for this project" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            repository: {
                id: repository.id,
                projectId: repository.projectId,
                repositoryName: repository.repositoryName,
                repositoryFullName: repository.repositoryFullName
            }
        });

    } catch (error: any) {
        console.error("[GET /api/github/repo-by-project] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch repository" },
            { status: 500 }
        );
    }
}
