import { NextRequest, NextResponse } from "next/server";

import { getGitHubToken } from "@/lib/github-auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get("repo");
    const sha = searchParams.get("sha");

    if (!repo || !sha) {
      return NextResponse.json(
        { error: "Repository and SHA are required" },
        { status: 400 }
      );
    }

    const { token } = await getGitHubToken();

    const response = await fetch(
      `https://api.github.com/repos/${repo}/commits/${sha}/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch commit status");
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching commit status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch commit status" },
      { status: 500 }
    );
  }
}
