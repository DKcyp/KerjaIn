import { NextRequest, NextResponse } from "next/server";

import { getGitHubToken } from "@/lib/github-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    const branch = searchParams.get("branch");

    if (!repo || !branch) {
      return NextResponse.json(
        { error: "Repository and branch parameters are required" },
        { status: 400 }
      );
    }

    // Extract owner from repo (format: owner/repo-name)
    const owner = repo.split('/')[0];
    const { token } = await getGitHubToken(owner);

    console.log(`[Branch API] Fetching branch: ${repo}/${branch}`);

    // Fetch branch info
    const branchRes = await fetch(
      `https://api.github.com/repos/${repo}/branches/${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!branchRes.ok) {
      console.error(`[Branch API] Branch fetch failed: ${branchRes.status}`);
      throw new Error(`Failed to fetch branch: ${branchRes.statusText}`);
    }

    const branchData = await branchRes.json();

    // Get pagination and sorting parameters
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("per_page") || "20");
    const sort = searchParams.get("sort") || "newest"; // newest or oldest

    // Fetch commits with pagination
    const commitsRes = await fetch(
      `https://api.github.com/repos/${repo}/commits?sha=${branch}&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!commitsRes.ok) {
      console.error(`[Branch API] Commits fetch failed: ${commitsRes.status}`);
      throw new Error(`Failed to fetch commits: ${commitsRes.statusText}`);
    }

    const commitsData = await commitsRes.json();

    console.log(`[Branch API] Success! Found ${commitsData.length} commits (page ${page})`);

    return NextResponse.json({
      branch: branchData,
      commits: commitsData,
      pagination: {
        page,
        perPage,
        hasMore: commitsData.length === perPage,
      },
    });
  } catch (error: any) {
    console.error("[Branch API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch branch data" },
      { status: 500 }
    );
  }
}
