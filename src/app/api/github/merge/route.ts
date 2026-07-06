import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";
import { invalidatePRCache } from "@/lib/pr-cache";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { repo, prNumber, targetBranch, approvedBy, mergeMethod } = body;

        if (!repo || !prNumber) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Parse owner/repo from fullRepo format "owner/repo"
        const [owner, repoName] = repo.split("/");
        if (!owner || !repoName) {
            return NextResponse.json(
                { error: "Invalid repo format. Expected 'owner/repo'" },
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

        console.log("[Merge PR] Merging PR:", { owner, repo: repoName, prNumber, mergeMethod, approvedBy });

        // Merge PR using GitHub API
        const mergeRes = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}/merge`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    merge_method: mergeMethod || "merge", // merge, squash, or rebase
                }),
            }
        );

        if (!mergeRes.ok) {
            const errorData = await mergeRes.json();
            console.error("[Merge PR] Failed:", errorData);
            return NextResponse.json(
                { error: errorData.message || "Failed to merge PR" },
                { status: mergeRes.status }
            );
        }

        const mergeData = await mergeRes.json();
        console.log("[Merge PR] Success:", mergeData);

        // Invalidate PR cache after successful merge
        invalidatePRCache(repo);

        // Helper to notify programmer
        try {
            // Fetch PR details to get title/body for Task Code extraction
            const prRes = await fetch(
                `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/vnd.github.v3+json",
                    }
                }
            );

            if (prRes.ok) {
                const prData = await prRes.json();
                const { notifyPRUpdate } = await import("@/lib/notificationHelper");
                const { getServerSession } = await import("@/lib/auth");
                const session = await getServerSession();

                await notifyPRUpdate({
                    prNumber: prData.number,
                    prTitle: prData.title,
                    prBody: prData.body,
                    repo: repoName,
                    action: 'merged',
                    actorName: approvedBy || 'Reviewer',
                    actorId: session?.user?.id
                });
            }
        } catch (notifWarn) {
            console.error("[Merge PR] Notification warning:", notifWarn);
            // Don't fail the request
        }

        return NextResponse.json({
            success: true,
            sha: mergeData.sha,
            merged: mergeData.merged,
            message: mergeData.message,
        });
    } catch (error: any) {
        console.error("[Merge PR] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
