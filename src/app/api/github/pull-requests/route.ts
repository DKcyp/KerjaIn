import { NextRequest, NextResponse } from "next/server";

import { getGitHubToken } from "@/lib/github-auth";
import { getPRCache, setPRCache } from "@/lib/pr-cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    const state = searchParams.get("state") || "open";
    const refresh = searchParams.get("refresh") === "true"; // Force refresh cache

    if (!repo) {
      return NextResponse.json(
        { error: "Repository is required" },
        { status: 400 }
      );
    }

    // CACHE DISABLED - Always fetch fresh data from GitHub to prevent stale PR data

    if (refresh) {
      console.log(`[PR API] Refresh requested, bypassing cache for ${repo}:${state}`);
    }

    // Extract owner from repo (format: owner/repo-name)
    const owner = repo.split('/')[0];
    console.log(`[PR API] Fetching PRs for repo: ${repo}, owner: ${owner}`);
    const { token } = await getGitHubToken(owner);

    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not configured" },
        { status: 500 }
      );
    }

    // Fetch pull requests from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repo}/pulls?state=${state}&sort=updated&direction=desc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub API error:", errorText);
      return NextResponse.json(
        { error: `GitHub API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const pullRequests = await response.json();

    // Cache disabled to always fetch fresh data
    // setPRCache(repo, state, pullRequests);

    return NextResponse.json({
      pullRequests: pullRequests.map((pr: any) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        user: {
          login: pr.user.login,
          avatar_url: pr.user.avatar_url,
        },
        head: {
          ref: pr.head.ref,
        },
        base: {
          ref: pr.base.ref,
        },
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
        draft: pr.draft,
        mergeable: pr.mergeable,
        mergeable_state: pr.mergeable_state,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching pull requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch pull requests" },
      { status: 500 }
    );
  }
}
