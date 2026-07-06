import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, branch, files, message } = body;

    if (!repo || !branch || !files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const { token } = await getGitHubToken();

    console.log('[Resolve Conflicts] Starting resolution:', {
      repo,
      branch,
      filesCount: files.length,
    });

    // Get the latest commit SHA for the branch
    const branchRes = await fetch(
      `https://api.github.com/repos/${repo}/git/refs/heads/${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!branchRes.ok) {
      throw new Error("Failed to get branch reference");
    }

    const branchData = await branchRes.json();
    const latestCommitSha = branchData.object.sha;

    console.log('[Resolve Conflicts] Latest commit SHA:', latestCommitSha);

    // Get the commit to get the tree SHA
    const commitRes = await fetch(
      `https://api.github.com/repos/${repo}/git/commits/${latestCommitSha}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!commitRes.ok) {
      throw new Error("Failed to get commit");
    }

    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    console.log('[Resolve Conflicts] Base tree SHA:', baseTreeSha);

    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file: { path: string; content: string }) => {
        const blobRes = await fetch(
          `https://api.github.com/repos/${repo}/git/blobs`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: file.content,
              encoding: "utf-8",
            }),
          }
        );

        if (!blobRes.ok) {
          throw new Error(`Failed to create blob for ${file.path}`);
        }

        const blobData = await blobRes.json();
        console.log('[Resolve Conflicts] Created blob for', file.path, ':', blobData.sha);

        return {
          path: file.path,
          mode: "100644",
          type: "blob",
          sha: blobData.sha,
        };
      })
    );

    // Create a new tree with the resolved files
    const treeRes = await fetch(
      `https://api.github.com/repos/${repo}/git/trees`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: blobs,
        }),
      }
    );

    if (!treeRes.ok) {
      const errorText = await treeRes.text();
      console.error('[Resolve Conflicts] Failed to create tree:', errorText);
      throw new Error("Failed to create tree");
    }

    const treeData = await treeRes.json();
    console.log('[Resolve Conflicts] Created tree:', treeData.sha);

    // Create a new commit
    const newCommitRes = await fetch(
      `https://api.github.com/repos/${repo}/git/commits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message || "Resolve merge conflicts",
          tree: treeData.sha,
          parents: [latestCommitSha],
        }),
      }
    );

    if (!newCommitRes.ok) {
      const errorText = await newCommitRes.text();
      console.error('[Resolve Conflicts] Failed to create commit:', errorText);
      throw new Error("Failed to create commit");
    }

    const newCommitData = await newCommitRes.json();
    console.log('[Resolve Conflicts] Created commit:', newCommitData.sha);

    // Update the branch reference to point to the new commit
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${repo}/git/refs/heads/${branch}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: false,
        }),
      }
    );

    if (!updateRefRes.ok) {
      const errorText = await updateRefRes.text();
      console.error('[Resolve Conflicts] Failed to update ref:', errorText);
      throw new Error("Failed to update branch reference");
    }

    console.log('[Resolve Conflicts] Successfully updated branch reference');

    return NextResponse.json({
      success: true,
      commitSha: newCommitData.sha,
      message: "Conflicts resolved successfully",
    });
  } catch (error: any) {
    console.error("[Resolve Conflicts] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resolve conflicts" },
      { status: 500 }
    );
  }
}
