import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";

/**
 * POST /api/github/workflows/trigger
 * Manually trigger a GitHub Actions workflow
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { repo, branch, workflowFile } = body;

        if (!repo) {
            return NextResponse.json(
                { error: "Repository is required" },
                { status: 400 }
            );
        }

        const owner = repo.split('/')[0];
        const { token } = await getGitHubToken(owner);

        if (!token) {
            return NextResponse.json(
                { error: "GitHub token not configured" },
                { status: 500 }
            );
        }

        const targetBranch = branch || 'main';
        const workflow = workflowFile || 'deploy.yml';

        console.log('[Trigger Workflow] Triggering:', {
            repo,
            branch: targetBranch,
            workflow
        });

        // Trigger workflow dispatch
        const response = await fetch(
            `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ref: targetBranch,
                    inputs: {
                        manual_trigger: 'true',
                        triggered_from: 'web_ui'
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[Trigger Workflow] Failed:', errorData);
            return NextResponse.json(
                { 
                    error: errorData.message || 'Failed to trigger workflow',
                    details: errorData
                },
                { status: response.status }
            );
        }

        console.log('[Trigger Workflow] Success');

        return NextResponse.json({
            success: true,
            message: 'Workflow triggered successfully',
            repository: repo,
            branch: targetBranch,
            workflow
        });

    } catch (error: any) {
        console.error('[Trigger Workflow] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to trigger workflow' },
            { status: 500 }
        );
    }
}
