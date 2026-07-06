import { NextRequest, NextResponse } from "next/server";

import { getGitHubToken } from "@/lib/github-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    const ref = searchParams.get("ref");

    if (!repo || !ref) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const { token } = await getGitHubToken();

    const response = await fetch(
      `https://api.github.com/repos/${repo}/commits/${ref}/check-runs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch check runs");
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching check runs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch check runs" },
      { status: 500 }
    );
  }
}
