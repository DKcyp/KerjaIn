import { NextRequest, NextResponse } from "next/server";

import { getGitHubToken } from "@/lib/github-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    const base = searchParams.get("base");
    const head = searchParams.get("head");

    if (!repo || !base || !head) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const { token } = await getGitHubToken();

    const response = await fetch(
      `https://api.github.com/repos/${repo}/compare/${base}...${head}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to compare branches");
    }

    const data = await response.json();

    return NextResponse.json({
      ahead_by: data.ahead_by,
      behind_by: data.behind_by,
      status: data.status,
      total_commits: data.total_commits,
      commits: data.commits || [],
      files: data.files || [],
    });
  } catch (error: any) {
    console.error("Error comparing branches:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compare branches" },
      { status: 500 }
    );
  }
}
