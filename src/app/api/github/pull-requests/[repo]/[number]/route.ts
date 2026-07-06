import { NextRequest, NextResponse } from "next/server";

import { getGitHubToken } from "@/lib/github-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ repo: string; number: string }> }
) {
  try {
    const { repo, number } = await params;

    if (!repo || !number) {
      return NextResponse.json(
        { error: "Repository and PR number are required" },
        { status: 400 }
      );
    }

    const { token } = await getGitHubToken();

    // Check if refresh is requested
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';

    // If refresh is requested, add a small delay to let GitHub process recent commits
    if (refresh) {
      console.log('[PR API] Refresh requested, waiting for GitHub to process changes...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Fetch PR details with cache control
    const prResponse = await fetch(
      `https://api.github.com/repos/${repo}/pulls/${number}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        // Disable cache when refreshing
        cache: refresh ? 'no-store' : 'default',
      }
    );

    if (!prResponse.ok) {
      console.error(`[PR API] GitHub Error: ${prResponse.status} ${prResponse.statusText}`);
      const errText = await prResponse.text();
      console.error(`[PR API] Error Body: ${errText}`);
      throw new Error(`Failed to fetch PR details: ${prResponse.status} ${prResponse.statusText}`);
    }

    const pr = await prResponse.json();

    // Fetch files changed
    const filesResponse = await fetch(
      `https://api.github.com/repos/${repo}/pulls/${number}/files`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
        cache: refresh ? 'no-store' : 'default',
      }
    );

    const files = filesResponse.ok ? await filesResponse.json() : [];

    return NextResponse.json({
      pr: {
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        user: {
          login: pr.user.login,
          avatar_url: pr.user.avatar_url,
        },
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha,
        },
        base: {
          ref: pr.base.ref,
        },
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        mergeable: pr.mergeable,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
        commits: pr.commits,
        html_url: pr.html_url,
      },
      files: files.map((file: any) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching PR details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch PR details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ repo: string; number: string }> }
) {
  try {
    const { repo, number } = await params;
    const body = await request.json();
    const { state } = body;

    // Validate
    if (!repo || !number || !state) {
      return NextResponse.json(
        { error: "Repository, PR number, and state are required" },
        { status: 400 }
      );
    }

    const { token } = await getGitHubToken();

    const response = await fetch(
      `https://api.github.com/repos/${repo}/pulls/${number}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PR API] Patch Error:", errorText);
      throw new Error(`Failed to update PR: ${response.statusText}`);
    }

    const data = await response.json();

    // Invalidate PR cache after closing/reopening PR
    const { invalidatePRCache } = await import("@/lib/pr-cache");
    invalidatePRCache(repo);
    console.log(`[PR API] Cache invalidated for repo: ${repo}`);

    // Notify if PR is closed
    // Notify if PR is closed
    if (state === 'closed') {
      console.log('🔔 [PR API] PR State is CLOSED, initiating notification sequence...');
      try {
        const { getServerSession } = await import('@/lib/auth');
        const session = await getServerSession();
        const user = session?.user;

        console.log('🔔 [PR API] Session User:', user ? `ID: ${user.id}, Name: ${user.namaLengkap}` : 'No Session');

        const { notifyPRUpdate } = await import("@/lib/notificationHelper");

        // Extract plain repo name
        const repoName = repo.includes('/') ? repo.split('/')[1] : repo;

        console.log(`🔔 [PR API] Calling notifyPRUpdate with:`, {
          prNumber: data.number,
          repo: repoName,
          actorName: user?.namaLengkap || 'Unknown',
          actorId: user?.id
        });

        await notifyPRUpdate({
          prNumber: data.number,
          prTitle: data.title,
          prBody: data.body,
          repo: repoName,
          action: 'closed',
          actorName: user?.namaLengkap || user?.username || 'Reviewer',
          actorId: user?.id
        });
        console.log('✅ [PR API] notifyPRUpdate called successfully');
      } catch (notifErr) {
        console.error('❌ [PR API] Failed to send notification:', notifErr);
      }
    }

    return NextResponse.json({ success: true, pr: data });
  } catch (error: any) {
    console.error("Error updating PR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update PR" },
      { status: 500 }
    );
  }
}
