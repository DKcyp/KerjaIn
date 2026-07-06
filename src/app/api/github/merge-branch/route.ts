import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";

export async function POST(req: NextRequest) {
  try {
    const { repo, base, head, commit_message } = await req.json();

    if (!repo || !base || !head) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const owner = repo.split('/')[0];
    
    // Check if GitHub credentials exist and are valid
    let token: string;
    try {
      const credentials = await getGitHubToken(owner);
      token = credentials.token;
      
      if (!token) {
        return NextResponse.json(
          { error: "GitHub credentials not configured. Please add credentials in Master GitHub." },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error('[Merge-branch] Failed to get GitHub token:', error);
      return NextResponse.json(
        { error: error.message || "GitHub credentials not configured. Please add credentials in Master GitHub." },
        { status: 400 }
      );
    }

    // Extract title and body from commit_message
    const parts = (commit_message || `Merge ${head} into ${base}`).split('\n\n');
    const title = parts[0];
    const body = parts.slice(1).join('\n\n') || "Auto-generated PR for task auto-merge";

    let prNumber: number | null = null;
    let prHtmlUrl: string | null = null;

    // 1. Try to create a Pull Request
    const prResponse = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
        body: body,
        head: head,
        base: base,
      }),
    });

    let prData: any = {};
    if (prResponse.status !== 204) {
      try {
        prData = await prResponse.json();
      } catch (e) {
        // empty body
      }
    }

    if (!prResponse.ok) {
      // Handle authentication errors
      if (prResponse.status === 401 || prResponse.status === 403) {
        return NextResponse.json(
          { error: "GitHub credentials are invalid or expired. Please update credentials in Master GitHub." },
          { status: 401 }
        );
      }
      
      // If 422, it could be "No commits between base and head" OR "A pull request already exists"
      if (prResponse.status === 422 && prData.errors && prData.errors[0]) {
        const errMsg = prData.errors[0].message || "";
        if (errMsg.includes("No commits between")) {
          return NextResponse.json(
            { error: "Branch tidak memiliki code terbaru dibandingkan target branch. Tidak ada perubahan yang bisa di-merge." },
            { status: 400 }
          );
        } else if (errMsg.includes("A pull request already exists")) {
          // Find the existing PR
          const existingPrsRes = await fetch(`https://api.github.com/repos/${repo}/pulls?head=${owner}:${head}&base=${base}&state=open`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (!existingPrsRes.ok && (existingPrsRes.status === 401 || existingPrsRes.status === 403)) {
            return NextResponse.json(
              { error: "GitHub credentials are invalid or expired. Please update credentials in Master GitHub." },
              { status: 401 }
            );
          }
          
          const existingPrs = await existingPrsRes.json();
          if (existingPrs && existingPrs.length > 0) {
            prNumber = existingPrs[0].number;
            prHtmlUrl = existingPrs[0].html_url;
          } else {
            throw new Error("Pull request exists but could not be found.");
          }
        } else {
          throw new Error(errMsg);
        }
      } else {
        throw new Error(prData.message || "Failed to create pull request");
      }
    } else {
      prNumber = prData.number;
      prHtmlUrl = prData.html_url;
    }

    // 2. Merge the Pull Request
    if (prNumber) {
      const mergeRes = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}/merge`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commit_title: title,
          commit_message: body,
          merge_method: "merge"
        })
      });

      let mergeData: any = {};
      try {
        mergeData = await mergeRes.json();
      } catch (e) { }

      if (!mergeRes.ok) {
        // Handle authentication errors
        if (mergeRes.status === 401 || mergeRes.status === 403) {
          return NextResponse.json(
            { error: "GitHub credentials are invalid or expired. Please update credentials in Master GitHub." },
            { status: 401 }
          );
        }
        
        if (mergeRes.status === 405) {
          // Method Not Allowed = Pull Request is not mergeable (Conflict)
          return NextResponse.json(
            {
              error: `Terdapat code conflict. Silakan selesaikan conflict secara manual pada Pull Request #${prNumber} di GitHub terlebih dahulu.`,
              isConflict: true,
              prUrl: prHtmlUrl
            },
            { status: 409 }
          );
        }
        throw new Error(mergeData.message || "Failed to merge pull request");
      }

      return NextResponse.json({
        success: true,
        message: `Successfully created and merged Pull Request #${prNumber}`,
        sha: mergeData.sha,
        prNumber: prNumber
      });
    }

  } catch (error: any) {
    console.error("Error creating/merging PR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process pull request" },
      { status: 500 }
    );
  }
}
