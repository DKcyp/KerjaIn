import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { getUserAccessibleRepositories } from "@/lib/githubPermissions";

const CACHE_TTL = 60 * 1000; // 60 seconds
let reposCache: {
  data: any[];
  timestamp: number;
} | null = null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usernameFilter = searchParams.get("username");

    // Check cache validity (only if no username filter is applied, for simplicity)
    // If username filter is applied, we skip cache or need smarter caching (skipping for now to be safe)
    if (!usernameFilter && reposCache && (Date.now() - reposCache.timestamp < CACHE_TTL)) {
      console.log(`[Repositories API] Returning cached data (${reposCache.data.length} repos)`);
      const allRepos = reposCache.data;

      // ... (Filtering logic remains the same)
      const uniqueRepos = Array.from(
        new Map(allRepos.map(r => [r.full_name, r])).values()
      );

      const { user } = await getServerSession();
      let filteredRepos = uniqueRepos;

      if (user && user.role === 'PROGRAMMER') {
        const accessibleRepoNames = await getUserAccessibleRepositories(user.id, user.role);
        filteredRepos = uniqueRepos.filter(repo =>
          accessibleRepoNames.includes(repo.name)
        );
      }

      return NextResponse.json({
        repositories: filteredRepos.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          html_url: repo.html_url,
          default_branch: repo.default_branch,
          open_issues_count: repo.open_issues_count,
          updated_at: repo.updated_at,
          stargazers_count: repo.stargazers_count,
          forks_count: repo.forks_count,
          language: repo.language,
          owner_source: repo.owner_source,
          is_organization: repo.is_organization,
        })),
        sources: [], // Cached sources not tracked strictly, or we could cache sources too
        total: filteredRepos.length,
      });
    }

    // Fetch from GitHub
    // Fetch all credentials, ordered by most recent first
    const credentials = await prisma.gitHubCredential.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (credentials.length === 0) {
      return NextResponse.json({
        error: "No GitHub credentials configured. Please add credentials in Master GitHub."
      }, { status: 400 });
    }

    const allRepos: any[] = [];
    const sources: string[] = [];

    // Fetch repos from each credential
    for (const cred of credentials) {
      const { token, username } = cred;

      // Skip if username filter is provided and doesn't match
      if (usernameFilter && username !== usernameFilter) {
        continue;
      }

      sources.push(username);

      try {
        // Check if this is a user or organization
        const userCheckResponse = await fetch(
          `https://api.github.com/users/${username}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (!userCheckResponse.ok) {
          console.error(`Failed to fetch user info for ${username}`);
          continue;
        }

        const userInfo = await userCheckResponse.json();
        const isOrganization = userInfo.type === "Organization";

        // Fetch repositories from the appropriate endpoint
        // For organizations: use /orgs/{org}/repos
        // For users: use /user/repos (authenticated user - includes private repos)
        //            or /users/{username}/repos (public repos only)
        let reposEndpoint: string;

        if (isOrganization) {
          // Organization repos - includes private repos if token has access
          reposEndpoint = `https://api.github.com/orgs/${username}/repos?sort=updated&per_page=100&type=all`;
        } else {
          // For personal accounts, use the authenticated user endpoint to get private repos
          // This will return all repos (public + private) that the token has access to
          reposEndpoint = `https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member`;
        }

        console.log(`[Repositories API] Fetching from: ${reposEndpoint}`);

        const response = await fetch(reposEndpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (!response.ok) {
          console.error(`GitHub API error for ${username}:`, response.statusText);
          continue;
        }

        const repositories = await response.json();

        console.log(`[Repositories API] Fetched ${repositories.length} repos for ${username} (${repositories.filter((r: any) => r.private).length} private)`);

        // Add owner label to each repo for UI grouping
        repositories.forEach((repo: any) => {
          repo.owner_source = username; // Group by credential that fetched it
          // We intentionally do not override full_name to preserve the actual GitHub path
          // repo.full_name = `${username}/${repo.name}`;
          repo.is_organization = isOrganization;
        });

        // Add all repositories this token has access to
        const filteredRepos = repositories;

        allRepos.push(...filteredRepos);
      } catch (error) {
        console.error(`Error fetching repos for ${username}:`, error);
        // Continue with other credentials
      }
    }

    // Update Cache
    if (!usernameFilter) {
      reposCache = {
        data: allRepos,
        timestamp: Date.now()
      };
    }

    // Deduplicate by full_name (in case same repo appears in multiple sources)
    const uniqueRepos = Array.from(
      new Map(allRepos.map(r => [r.full_name, r])).values()
    );

    // Filter by user access
    const { user } = await getServerSession();
    let filteredRepos = uniqueRepos;

    if (user && user.role === 'PROGRAMMER') {
      // Get repos accessible by this Programmer
      const accessibleRepoNames = await getUserAccessibleRepositories(user.id, user.role);
      console.log(`[Repositories API] PROGRAMMER ${user.id} accessible repos:`, accessibleRepoNames);
      console.log(`[Repositories API] Total repos before filter:`, uniqueRepos.length);
      // Filter to only show repos that are assigned to this programmer
      filteredRepos = uniqueRepos.filter(repo =>
        accessibleRepoNames.includes(repo.name)
      );
      console.log(`[Repositories API] Total repos after filter:`, filteredRepos.length);
    }
    // Super Admin and PM see all repos (no filtering)
    // PM needs to see all repos to be able to map them to projects

    return NextResponse.json({
      repositories: filteredRepos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
        open_issues_count: repo.open_issues_count,
        updated_at: repo.updated_at,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        language: repo.language,
        owner_source: repo.owner_source,
        is_organization: repo.is_organization,
      })),
      sources,
      total: filteredRepos.length,
    });
  } catch (error: any) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
