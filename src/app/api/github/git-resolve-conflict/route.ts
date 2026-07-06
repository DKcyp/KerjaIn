import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { getGitHubToken } from "@/lib/github-auth";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "start";

    if (action === "start") {
        return handleStart(request);
    } else if (action === "read") {
        return handleRead(request);
    } else if (action === "resolve") {
        return handleResolve(request);
    } else if (action === "commit") {
        return handleCommit(request);
    } else {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
}

async function handleStart(request: NextRequest) {
    try {
        const body = await request.json();
        const { owner, repo, pullRequestNumber } = body;

        if (!owner || !repo || !pullRequestNumber) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        const { token } = await getGitHubToken();

        console.log("[Merge Start] Starting merge session:", {
            owner,
            repo,
            pullRequestNumber,
        });

        // Fetch PR details
        const prRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${pullRequestNumber}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        if (!prRes.ok) {
            throw new Error("Failed to fetch PR details");
        }

        const prData = await prRes.json();
        const baseRef = prData.base.ref;
        const headRef = prData.head.ref;

        // Create temp directory
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "git-merge-"));
        console.log("[Merge Start] Temp dir:", tempDir);

        // Clone repository
        const repoUrl = `https://${token}@github.com/${owner}/${repo}.git`;
        await execAsync(`git clone ${repoUrl} .`, { cwd: tempDir });

        // Configure git
        await execAsync(`git config user.email "bot@conflict-resolver.app"`, {
            cwd: tempDir,
        });
        await execAsync(`git config user.name "Conflict Resolver Bot"`, {
            cwd: tempDir,
        });

        // Checkout HEAD branch
        await execAsync(`git checkout ${headRef}`, { cwd: tempDir });

        // Start merge (will fail with conflicts)
        try {
            await execAsync(`git merge origin/${baseRef}`, { cwd: tempDir });

            // No conflicts - cleanup and return
            await fs.rm(tempDir, { recursive: true, force: true });
            return NextResponse.json({
                success: true,
                hasConflicts: false,
                message: "No conflicts found",
            });
        } catch (mergeError) {
            // Conflicts detected - continue
        }

        // Parse conflicted files
        const { stdout: statusOutput } = await execAsync("git status --porcelain", {
            cwd: tempDir,
        });

        const conflictedFiles: string[] = [];
        const lines = statusOutput.split("\n");

        for (const line of lines) {
            if (line.startsWith("UU ") || line.startsWith("AA ")) {
                const filePath = line.substring(3).trim();
                if (filePath) {
                    conflictedFiles.push(filePath);
                }
            }
        }

        if (conflictedFiles.length === 0) {
            await fs.rm(tempDir, { recursive: true, force: true });
            throw new Error("Merge failed but no conflicted files found");
        }

        console.log("[Merge Start] Conflicted files:", conflictedFiles);

        return NextResponse.json({
            success: true,
            hasConflicts: true,
            sessionId: tempDir, // Use temp dir path as session ID
            conflictedFiles,
            baseRef,
            headRef,
        });
    } catch (error: any) {
        console.error("[Merge Start] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

async function handleRead(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, filePath } = body;

        if (!sessionId || !filePath) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        console.log("[Merge Read] Reading file from session:", { sessionId, filePath });

        const filePathAbs = path.join(sessionId, filePath);
        console.log("[Merge Read] Absolute path:", filePathAbs);

        try {
            await fs.access(filePathAbs);
        } catch (e) {
            console.error("[Merge Read] File does not exist:", filePathAbs);
            return NextResponse.json({ error: "File not found in session" }, { status: 404 });
        }

        const content = await fs.readFile(filePathAbs, "utf-8");
        // console.log(`[Merge Read] Content loaded. Length: ${content.length}`);

        if (!content.includes("<<<<<<<")) {
            console.warn("[Merge Read] WARNING: File has no conflict markers but was requested!");
        }

        // Check if session exists
        try {
            await fs.access(sessionId);
        } catch {
            return NextResponse.json(
                { error: "Session not found or expired" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            content: content,
            hasConflictMarkers: content.includes("<<<<<<<") &&
                content.includes("=======") &&
                content.includes(">>>>>>>")
        });

    } catch (error: any) {
        console.error("[Merge Read] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

async function handleResolve(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, filePath, resolutionMode } = body;

        if (!sessionId || !filePath || !resolutionMode) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        console.log("[Merge Resolve] Resolving file:", { sessionId, filePath, resolutionMode });

        // Check if session exists
        try {
            await fs.access(sessionId);
        } catch {
            return NextResponse.json(
                { error: "Session not found or expired" },
                { status: 404 }
            );
        }

        // Read conflicted file
        const fileFullPath = path.join(sessionId, filePath);
        const fileContent = await fs.readFile(fileFullPath, "utf-8");

        // Check for conflict markers
        if (!fileContent.includes("<<<<<<<") || !fileContent.includes("=======") || !fileContent.includes(">>>>>>>")) {
            return NextResponse.json(
                { error: `File ${filePath} does not have conflict markers` },
                { status: 400 }
            );
        }

        // Resolve conflicts
        const resolvedContent = resolveConflicts(fileContent, resolutionMode);

        // Verify that resolved content has no conflict markers
        const hasMarkers = resolvedContent.includes("<<<<<<<") ||
            resolvedContent.includes("=======") ||
            resolvedContent.includes(">>>>>>>");

        if (hasMarkers) {
            return NextResponse.json(
                {
                    error: `Failed to resolve conflicts in ${filePath}. Conflict markers still present after resolution.`,
                    details: `Resolution mode '${resolutionMode}' did not remove all conflict markers.`
                },
                { status: 500 }
            );
        }

        // Write resolved content
        await fs.writeFile(fileFullPath, resolvedContent, "utf-8");

        // Git add
        await execAsync(`git add "${filePath}"`, { cwd: sessionId });

        // Check remaining conflicts
        const { stdout: statusOutput } = await execAsync("git status --porcelain", {
            cwd: sessionId,
        });

        const remainingConflicts: string[] = [];
        const lines = statusOutput.split("\n");

        for (const line of lines) {
            if (line.startsWith("UU ") || line.startsWith("AA ")) {
                const fp = line.substring(3).trim();
                if (fp) {
                    remainingConflicts.push(fp);
                }
            }
        }

        const allResolved = remainingConflicts.length === 0;

        return NextResponse.json({
            success: true,
            remainingConflicts,
            allResolved,
        });
    } catch (error: any) {
        console.error("[Merge Resolve] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

async function handleCommit(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
        }

        console.log("[Merge Commit] Committing merge:", { sessionId });

        // Check if session exists
        try {
            await fs.access(sessionId);
        } catch {
            return NextResponse.json(
                { error: "Session not found or expired" },
                { status: 404 }
            );
        }

        // Check for remaining conflicts
        const { stdout: statusOutput } = await execAsync("git status --porcelain", {
            cwd: sessionId,
        });

        const lines = statusOutput.split("\n");
        for (const line of lines) {
            if (line.startsWith("UU ") || line.startsWith("AA ")) {
                return NextResponse.json(
                    { error: "Not all conflicts resolved" },
                    { status: 400 }
                );
            }
        }

        // Create merge commit
        await execAsync(`git commit -m "Resolve merge conflicts"`, {
            cwd: sessionId,
        });

        // Get commit SHA
        const { stdout: commitSha } = await execAsync(`git rev-parse HEAD`, {
            cwd: sessionId,
        });

        // Get head ref from git
        const { stdout: headRef } = await execAsync(`git rev-parse --abbrev-ref HEAD`, {
            cwd: sessionId,
        });

        // Push
        await execAsync(`git push origin ${headRef.trim()}`, {
            cwd: sessionId,
        });

        console.log("[Merge Commit] Push successful");

        // Cleanup
        await fs.rm(sessionId, { recursive: true, force: true });

        return NextResponse.json({
            success: true,
            commitSha: commitSha.trim(),
            message: "Merge completed successfully",
        });
    } catch (error: any) {
        console.error("[Merge Commit] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

function resolveConflicts(
    content: string,
    mode: "current" | "incoming" | "both"
): string {
    // If no markers found, handle gracefully
    if (!content.includes("<<<<<<<")) {
        return content;
    }

    const lines = content.split("\n");
    const resolved: string[] = [];
    let state: "normal" | "current" | "incoming" = "normal";
    const currentSection: string[] = [];
    const incomingSection: string[] = [];

    for (const line of lines) {
        if (line.startsWith("<<<<<<<")) {
            state = "current";
            continue;
        } else if (line.startsWith("=======")) {
            state = "incoming";
            continue;
        } else if (line.startsWith(">>>>>>>")) {
            if (mode === "current") {
                resolved.push(...currentSection);
            } else if (mode === "incoming") {
                resolved.push(...incomingSection);
            } else if (mode === "both") {
                resolved.push(...currentSection);
                resolved.push(...incomingSection);
            }

            currentSection.length = 0;
            incomingSection.length = 0;
            state = "normal";
            continue;
        }

        if (state === "current") {
            currentSection.push(line);
        } else if (state === "incoming") {
            incomingSection.push(line);
        } else {
            resolved.push(line);
        }
    }

    // EOF edge case: flush remaining sections if file ends before >>>>>>>
    if (state !== "normal" && (currentSection.length > 0 || incomingSection.length > 0)) {
        if (mode === "current") {
            resolved.push(...currentSection);
        } else if (mode === "incoming") {
            resolved.push(...incomingSection);
        } else if (mode === "both") {
            resolved.push(...currentSection);
            resolved.push(...incomingSection);
        }
    }

    return resolved.join("\n");
}
