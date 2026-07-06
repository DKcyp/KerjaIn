import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";

/**
 * POST /api/github/webhooks/redeliver
 * Redeliver a failed webhook delivery
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { repo, hookId, deliveryId } = body;

        if (!repo || !hookId || !deliveryId) {
            return NextResponse.json(
                { error: "Repository, hook ID, and delivery ID are required" },
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

        console.log(`[Redeliver API] Redelivering webhook: repo=${repo}, hookId=${hookId}, deliveryId=${deliveryId}`);

        // Call GitHub API to redeliver the webhook
        const response = await fetch(
            `https://api.github.com/repos/${repo}/hooks/${hookId}/deliveries/${deliveryId}/attempts`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Redeliver API] GitHub error:', errorText);
            return NextResponse.json(
                { error: `GitHub API error: ${response.statusText}` },
                { status: response.status }
            );
        }

        console.log('[Redeliver API] Webhook redelivered successfully');

        return NextResponse.json({
            success: true,
            message: 'Webhook redelivered successfully'
        });

    } catch (error: any) {
        console.error('[Redeliver API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to redeliver webhook' },
            { status: 500 }
        );
    }
}
