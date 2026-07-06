import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";
import { invalidatePRCache } from "@/lib/pr-cache";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { repo, prNumber, closedBy } = body;

        if (!repo || !prNumber) {
            return NextResponse.json(
                { error: "Missing required parameters: repo, prNumber" },
                { status: 400 }
            );
        }

        const { token } = await getGitHubToken();
        if (!token) {
            return NextResponse.json(
                { error: "GitHub token not configured" },
                { status: 500 }
            );
        }

        console.log("[Close PR] Closing PR:", { repo, prNumber, closedBy });

        // Close PR using GitHub API
        const closeRes = await fetch(
            `https://api.github.com/repos/${repo}/pulls/${prNumber}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    state: "closed"
                }),
            }
        );

        if (!closeRes.ok) {
            const errorData = await closeRes.json();
            console.error("[Close PR] Failed:", errorData);
            return NextResponse.json(
                { error: errorData.message || "Failed to close PR" },
                { status: closeRes.status }
            );
        }

        const prData = await closeRes.json();
        console.log("[Close PR] Success:", prData.number);

        // Invalidate PR cache after closing
        invalidatePRCache(repo);

        // Send notification to PR creator
        try {
            const repoName = repo.split('/').pop();
            const { notifyPRUpdate } = await import("@/lib/notificationHelper");
            const { getServerSession } = await import("@/lib/auth");
            const session = await getServerSession();

            await notifyPRUpdate({
                prNumber: prData.number,
                prTitle: prData.title,
                prBody: prData.body,
                repo: repoName || repo,
                action: 'closed',
                actorName: closedBy || session?.user?.namaLengkap || 'PM',
                actorId: session?.user?.id
            });

            console.log("[Close PR] Notification sent to PR creator");
        } catch (notifError) {
            console.error("[Close PR] Notification error:", notifError);
            // Don't fail the request
        }

        return NextResponse.json({
            success: true,
            state: prData.state,
            number: prData.number,
            message: "Pull request closed successfully"
        });
    } catch (error: any) {
        console.error("[Close PR] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
