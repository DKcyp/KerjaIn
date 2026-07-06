import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";

export async function POST(req: NextRequest) {
  try {
    const { repo, base, head } = await req.json();

    if (!repo || !base || !head) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const { token } = await getGitHubToken();

    // Compare branches
    const response = await fetch(
      `https://api.github.com/repos/${repo}/compare/${base}...${head}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      status: data.status,
      ahead_by: data.ahead_by,
      behind_by: data.behind_by,
      total_commits: data.total_commits,
      files: data.files,
    });
  } catch (error: any) {
    console.error("Error comparing branches:", error);
    return NextResponse.json(
      { error: error.message || "Failed to compare branches" },
      { status: 500 }
    );
  }
}
