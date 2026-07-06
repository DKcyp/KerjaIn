import { NextRequest, NextResponse } from "next/server";
import { getGitHubToken } from "@/lib/github-auth";

/**
 * GET /api/github/workflows?repo=owner/repo&limit=50&type=webhooks
 * Get webhook deliveries OR workflow runs from GitHub
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const repo = searchParams.get("repo");
        const limit = parseInt(searchParams.get("limit") || "50");
        const type = searchParams.get("type") || "workflows"; // 'workflows' or 'webhooks'

        if (!repo) {
            return NextResponse.json(
                { error: "Repository parameter is required" },
                { status: 400 }
            );
        }

        const owner = repo.split('/')[0];
        const { token } = await getGitHubToken(owner);

        if (!token) {
            return NextResponse.json(
                { error: "GitHub token not configured" },
                { status: 500 }
            );
        }

        // Fetch webhook deliveries if type is 'webhooks'
        if (type === 'webhooks') {
            console.log(`[Webhooks API] Fetching webhooks for repo: ${repo}`);
            
            // First, get list of webhooks for this repo
            const webhooksResponse = await fetch(
                `https://api.github.com/repos/${repo}/hooks`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                    },
                    cache: 'no-store'
                }
            );

            if (!webhooksResponse.ok) {
                const errorText = await webhooksResponse.text();
                console.error('[Webhooks API] GitHub error:', errorText);
                return NextResponse.json(
                    { error: `GitHub API error: ${webhooksResponse.statusText}` },
                    { status: webhooksResponse.status }
                );
            }

            const hooks = await webhooksResponse.json();
            console.log(`[Webhooks API] Found ${hooks.length} hooks for ${repo}`);
            
            if (hooks.length === 0) {
                return NextResponse.json({
                    webhooks: [],
                    statistics: { total: 0, success: 0, failure: 0, pending: 0 },
                    repository: repo,
                    message: 'No webhooks configured for this repository'
                });
            }

            // Fetch deliveries from ALL webhooks and combine them
            const allDeliveries: any[] = [];
            const perPage = Math.min(limit, 30); // GitHub max is 30 for webhook deliveries per hook
            
            for (const hook of hooks) {
                try {
                    const deliveriesResponse = await fetch(
                        `https://api.github.com/repos/${repo}/hooks/${hook.id}/deliveries?per_page=${perPage}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Accept': 'application/vnd.github.v3+json',
                            },
                            cache: 'no-store'
                        }
                    );

                    if (deliveriesResponse.ok) {
                        const deliveries = await deliveriesResponse.json();
                        
                        // Fetch detailed payload for each delivery
                        const detailedDeliveries = await Promise.all(
                            deliveries.map(async (d: any) => {
                                try {
                                    const detailResponse = await fetch(
                                        `https://api.github.com/repos/${repo}/hooks/${hook.id}/deliveries/${d.id}`,
                                        {
                                            headers: {
                                                'Authorization': `Bearer ${token}`,
                                                'Accept': 'application/vnd.github.v3+json',
                                            },
                                            cache: 'no-store'
                                        }
                                    );
                                    
                                    if (detailResponse.ok) {
                                        const detail = await detailResponse.json();
                                        return { ...detail, hookId: hook.id };
                                    }
                                } catch (error) {
                                    console.error(`[Webhook] Failed to fetch detail for delivery ${d.id}:`, error);
                                }
                                // Fallback to basic delivery data
                                return { ...d, hookId: hook.id };
                            })
                        );
                        
                        allDeliveries.push(...detailedDeliveries);
                    }
                } catch (error) {
                    console.error(`[Webhook] Failed to fetch deliveries for hook ${hook.id}:`, error);
                }
            }

            // Sort by delivered_at descending (newest first)
            allDeliveries.sort((a, b) => 
                new Date(b.delivered_at).getTime() - new Date(a.delivered_at).getTime()
            );

            // Take only the requested limit
            const deliveries = allDeliveries.slice(0, limit);
            console.log(`[Webhooks API] Returning ${deliveries.length} deliveries for ${repo} from ${hooks.length} hooks`);

            // Calculate statistics
            const stats = {
                total: deliveries.length,
                success: deliveries.filter((d: any) => d.status_code >= 200 && d.status_code < 300).length,
                failure: deliveries.filter((d: any) => d.status_code >= 400).length,
                pending: deliveries.filter((d: any) => d.status === 'pending').length
            };

            // Format webhook deliveries
            const webhooks = deliveries.map((delivery: any) => {
                const payload = delivery.request?.payload || {};
                const headCommit = payload.head_commit || {};
                const pusher = payload.pusher || {};
                const sender = payload.sender || {};
                const repository = payload.repository || {};
                
                // Debug log untuk melihat struktur data
                console.log(`[Webhook Detail] Delivery ${delivery.id}:`, {
                    event: delivery.event,
                    hasPayload: !!delivery.request?.payload,
                    payloadKeys: Object.keys(payload),
                    hasHeadCommit: !!headCommit.id,
                    hasPusher: !!pusher.name,
                    hasSender: !!sender.login,
                    hasRepository: !!repository.full_name
                });
                
                return {
                    id: delivery.id,
                    guid: delivery.guid,
                    event: delivery.event,
                    action: delivery.action,
                    status: delivery.status_code >= 200 && delivery.status_code < 300 ? 'success' : 'failure',
                    statusCode: delivery.status_code,
                    duration: delivery.duration,
                    deliveredAt: delivery.delivered_at,
                    redelivery: delivery.redelivery,
                    hookId: delivery.hookId,
                    
                    // Branch & Commit info
                    branch: payload.ref?.replace('refs/heads/', '') || payload.ref?.replace('refs/tags/', ''),
                    commit: payload.after || headCommit.id,
                    commitMessage: headCommit.message,
                    commitUrl: headCommit.url,
                    
                    // Pusher info (person who pushed)
                    pusherName: pusher.name,
                    pusherEmail: pusher.email,
                    
                    // Author info (commit author)
                    authorName: headCommit.author?.name,
                    authorEmail: headCommit.author?.email,
                    authorUsername: headCommit.author?.username,
                    
                    // Committer info
                    committerName: headCommit.committer?.name,
                    committerEmail: headCommit.committer?.email,
                    
                    // Sender info (GitHub user who triggered)
                    triggeredBy: sender.login || pusher.name,
                    avatarUrl: sender.avatar_url,
                    senderUrl: sender.html_url,
                    
                    // Repository info
                    repositoryName: repository.name,
                    repositoryFullName: repository.full_name,
                    repositoryUrl: repository.html_url,
                    repositoryPrivate: repository.private,
                    
                    // Compare URL for push events
                    compareUrl: payload.compare,
                    
                    // Additional metadata
                    created: payload.created,
                    deleted: payload.deleted,
                    forced: payload.forced,
                    baseRef: payload.base_ref,
                    
                    // Commits count (for push events)
                    commitsCount: payload.commits?.length || 0,
                    commits: payload.commits?.slice(0, 5).map((c: any) => ({
                        id: c.id,
                        message: c.message,
                        author: c.author?.name,
                        url: c.url
                    })) || []
                };
            });

            return NextResponse.json({
                webhooks,
                statistics: stats,
                repository: repo,
                totalHooks: hooks.length
                // No need to return hookId here anymore, each webhook has its own hookId
            });
        }

        // Default: Fetch workflow runs (existing code)
        const branch = searchParams.get("branch");
        const params = new URLSearchParams({
            per_page: limit.toString()
        });

        if (branch) {
            params.append('branch', branch);
        }

        const response = await fetch(
            `https://api.github.com/repos/${repo}/actions/runs?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Workflows API] GitHub error:', errorText);
            return NextResponse.json(
                { error: `GitHub API error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const runs = data.workflow_runs || [];

        const stats = {
            total: runs.length,
            success: runs.filter((r: any) => r.conclusion === 'success').length,
            failure: runs.filter((r: any) => r.conclusion === 'failure').length,
            in_progress: runs.filter((r: any) => r.status === 'in_progress').length,
            cancelled: runs.filter((r: any) => r.conclusion === 'cancelled').length
        };

        const workflows = runs.map((run: any) => ({
            id: run.id,
            name: run.name,
            displayTitle: run.display_title,
            status: run.status,
            conclusion: run.conclusion,
            branch: run.head_branch,
            commit: run.head_sha,
            commitMessage: run.head_commit?.message,
            event: run.event,
            triggeredBy: run.actor?.login,
            avatarUrl: run.actor?.avatar_url,
            createdAt: run.created_at,
            updatedAt: run.updated_at,
            runNumber: run.run_number,
            htmlUrl: run.html_url,
            duration: run.updated_at && run.created_at 
                ? Math.floor((new Date(run.updated_at).getTime() - new Date(run.created_at).getTime()) / 1000)
                : null
        }));

        return NextResponse.json({
            workflows,
            statistics: stats,
            repository: repo
        });

    } catch (error: any) {
        console.error('[Workflows/Webhooks API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch data' },
            { status: 500 }
        );
    }
}
