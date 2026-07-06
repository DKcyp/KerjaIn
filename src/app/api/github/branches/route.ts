import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");

    if (!repo) {
      return NextResponse.json(
        { error: "Repository parameter is required" },
        { status: 400 }
      );
    }

    // Extract owner from repo (format: owner/repo-name)
    const owner = repo.split('/')[0];
    const { token } = await getGitHubToken(owner);

    const response = await fetch(
      `https://api.github.com/repos/${repo}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch branches");
    }

    const branches = await response.json();

    return NextResponse.json({
      branches: branches.map((branch: any) => ({
        name: branch.name,
        commit: {
          sha: branch.commit.sha,
          url: branch.commit.url,
        },
        protected: branch.protected,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch branches" },
      { status: 500 }
    );
  }
}
