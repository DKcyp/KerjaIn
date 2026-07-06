import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getGitHubToken } from "@/lib/github-auth";
import { invalidatePRCache } from "@/lib/pr-cache";

/**
 * POST /api/github/create-pr
 * Create a new pull request
 */
export async function POST(request: NextRequest) {
    try {
        const { user } = await getServerSession();
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { repo, head, base, title, body: description } = body;

        if (!repo || !head || !base || !title) {
            return NextResponse.json(
                { error: "Missing required fields: repo, head, base, title" },
                { status: 400 }
            );
        }

        console.log('[POST /api/github/create-pr] Creating PR:', {
            repo,
            head,
            base,
            title,
            user: user.username
        });

        const { token } = await getGitHubToken();

        // Create PR via GitHub API
        const response = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                body: description || '',
                head,
                base,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[POST /api/github/create-pr] GitHub API error:', errorData);

            // Handle specific errors
            if (response.status === 422) {
                return NextResponse.json(
                    { error: errorData.errors?.[0]?.message || "Validation failed. Check if PR already exists or branches are the same." },
                    { status: 422 }
                );
            }

            return NextResponse.json(
                { error: errorData.message || "Failed to create pull request" },
                { status: response.status }
            );
        }

        const prData = await response.json();

        console.log('[POST /api/github/create-pr] PR created successfully:', {
            number: prData.number,
            url: prData.html_url
        });

        // Invalidate PR cache after creating new PR
        invalidatePRCache(repo);

        // Send notification to PM
        try {
            const { prisma } = await import('@/lib/prisma');

            // Extract repository name from full repo path (e.g., "owner/repo" -> "repo")
            const repoName = repo.split('/').pop();

            // Find project by repository mapping
            const githubRepo = await prisma.gitHubRepository.findFirst({
                where: {
                    OR: [
                        { repositoryName: repoName },
                        { repositoryFullName: repo }
                    ]
                }
            });

            if (githubRepo) {
                // Find ALL PMs for this project
                const pmTeams = await prisma.proyekTeam.findMany({
                    where: {
                        projectId: githubRepo.projectId,
                        jabatan: { contains: 'pm', mode: 'insensitive' }
                    }
                });

                // Get project info
                const project = await prisma.proyek.findUnique({
                    where: { id: githubRepo.projectId },
                    select: { kodeProyek: true, namaProyek: true }
                });

                if (pmTeams.length > 0) {
                    console.log(`[POST /api/github/create-pr] Sending notifications to ${pmTeams.length} PM(s)`);

                    // Send notification to each PM
                    for (const pmTeam of pmTeams) {
                        // Skip self-notification if PM is creating the PR
                        if (pmTeam.pegawaiId === user.id) {
                            console.log(`[POST /api/github/create-pr] Skipping notification - PM is the creator`);
                            continue;
                        }

                        // Get PM details
                        const pm = await prisma.pegawai.findUnique({
                            where: { id: pmTeam.pegawaiId },
                            select: { id: true, namaLengkap: true }
                        });

                        if (!pm) {
                            console.log(`[POST /api/github/create-pr] PM ${pmTeam.pegawaiId} not found`);
                            continue;
                        }

                        // Create notification in database
                        const notification = await prisma.notification.create({
                            data: {
                                userId: pmTeam.pegawaiId,
                                type: 'github.pr.created',
                                title: 'Pull Request Baru',
                                message: `PR #${prData.number}: ${title} (${head} ➝ ${base})`,
                                projectId: githubRepo.projectId,
                                projectName: project?.namaProyek,
                                fromUserId: user.id,
                                fromUserName: user.username || user.namaLengkap,
                                priority: 'medium',
                                data: {
                                    prNumber: prData.number,
                                    prUrl: prData.html_url,
                                    repo: repoName,
                                    fullRepo: repo,
                                    head,
                                    base,
                                    isPRNotification: true
                                }
                            }
                        });

                        console.log(`[POST /api/github/create-pr] Notification created for PM: ${pm.namaLengkap}`);

                        // Send real-time notification via Pusher
                        try {
                            const { sendNotificationToUser } = await import('@/lib/pusher-server');
                            await sendNotificationToUser(pmTeam.pegawaiId, {
                                id: `db-${notification.id}`,
                                type: 'github.pr.created',
                                title: 'Pull Request Baru',
                                message: `PR #${prData.number}: ${title} (${head} ➝ ${base})`,
                                projectId: githubRepo.projectId,
                                projectName: project?.namaProyek,
                                fromUserId: user.id,
                                fromUserName: user.username || user.namaLengkap || 'System',
                                timestamp: notification.createdAt.toISOString(),
                                priority: 'medium',
                                data: {
                                    prNumber: prData.number,
                                    prUrl: prData.html_url,
                                    repo: repoName,
                                    fullRepo: repo,
                                    head,
                                    base,
                                    isPRNotification: true
                                }
                            });
                            console.log(`[POST /api/github/create-pr] Real-time notification sent to PM: ${pm.namaLengkap}`);
                        } catch (pusherError) {
                            console.error(`[POST /api/github/create-pr] Failed to send Pusher notification to PM ${pm.namaLengkap}:`, pusherError);
                        }
                    }
                } else {
                    console.log(`[POST /api/github/create-pr] No PMs found for project ${githubRepo.projectId}`);
                }
            }
        } catch (notifError) {
            console.error('[POST /api/github/create-pr] Failed to send notification:', notifError);
            // Don't fail the PR creation if notification fails
        }

        return NextResponse.json({
            success: true,
            pullRequest: {
                number: prData.number,
                url: prData.html_url,
                title: prData.title,
                state: prData.state,
                created_at: prData.created_at,
            }
        });

    } catch (error: any) {
        console.error("[POST /api/github/create-pr] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create pull request" },
            { status: 500 }
        );
    }
}
