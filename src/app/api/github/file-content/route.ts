import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    const path = searchParams.get("path");
    const ref = searchParams.get("ref");

    if (!repo || !path) {
      return NextResponse.json({ error: "Missing repo or path" }, { status: 400 });
    }

    const { token } = await getGitHubToken();

    if (!repo || !path) {
      return NextResponse.json({ error: "Missing repo or path" }, { status: 400 });
    }

    // Token already fetched above
    if (!token) {
      return NextResponse.json(
        { error: "GitHub token not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`,
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
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return NextResponse.json({
      content,
      sha: data.sha,
      size: data.size,
    });
  } catch (error: any) {
    console.error("Error fetching file content:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch file content" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, path, content, sha, branch, message } = body;

    console.log('[GitHub File Update] Request:', { repo, path, branch, sha: sha?.substring(0, 7), contentLength: content?.length });

    if (!repo || !path || !content || !sha || !branch) {
      console.error('[GitHub File Update] Missing parameters:', { repo: !!repo, path: !!path, content: !!content, sha: !!sha, branch: !!branch });
      return NextResponse.json(
        { error: "Missing required parameters", details: { repo: !!repo, path: !!path, content: !!content, sha: !!sha, branch: !!branch } },
        { status: 400 }
      );
    }

    const { token } = await getGitHubToken();
    if (!token) {
      console.error('[GitHub File Update] GitHub token not configured');
      return NextResponse.json(
        { error: "GitHub token not configured" },
        { status: 500 }
      );
    }

    const encodedContent = Buffer.from(content).toString("base64");
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

    console.log('[GitHub File Update] Calling GitHub API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message || `Update ${path} via PR editor`,
        content: encodedContent,
        sha,
        branch,
      }),
    });

    console.log('[GitHub File Update] GitHub API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[GitHub File Update] GitHub API error:', errorData);
      return NextResponse.json(
        { error: errorData.message || "Failed to update file", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[GitHub File Update] Success! Commit SHA:', data.commit?.sha?.substring(0, 7));

    return NextResponse.json({
      success: true,
      commit: data.commit,
      message: "File updated successfully",
    });
  } catch (error: any) {
    console.error("[GitHub File Update] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update file", stack: error.stack },
      { status: 500 }
    );
  }
}
