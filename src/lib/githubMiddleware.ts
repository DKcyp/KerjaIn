import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "./auth";
import { getGitHubAccessControl, canAccessRepository, getRepositoryName, filterPullRequestsByRole } from "./githubPermissions";

/**
 * Middleware untuk check authentication dan authorization untuk GitHub APIs
 * Gunakan ini di awal setiap GitHub API route
 */
export async function withGitHubAuth(request: NextRequest) {
  const { user } = await getServerSession();
  
  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  return {
    authorized: true,
    response: null,
    user,
  };
}

/**
 * Middleware untuk check repository access
 */
export async function withRepositoryAccess(
  request: NextRequest,
  repositoryName: string
) {
  const authCheck = await withGitHubAuth(request);
  if (!authCheck.authorized || !authCheck.user) {
    return authCheck;
  }

  const hasAccess = await canAccessRepository(
    authCheck.user.id,
    authCheck.user.role,
    repositoryName
  );

  if (!hasAccess) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "You don't have access to this repository" },
        { status: 403 }
      ),
      user: authCheck.user,
    };
  }

  return {
    authorized: true,
    response: null,
    user: authCheck.user,
  };
}

/**
 * Helper untuk filter repositories berdasarkan user access
 */
export async function filterRepositoriesByAccess(
  repositories: any[],
  user: any
) {
  if (user.role === 'SUPER_ADMIN') {
    return repositories;
  }

  const accessControl = await getGitHubAccessControl(user);
  
  if (accessControl.allowedRepositories.length === 0) {
    return [];
  }

  return repositories.filter((repo: any) => {
    const repoName = getRepositoryName(repo.full_name);
    return accessControl.allowedRepositories.includes(repoName);
  });
}

/**
 * Helper untuk filter PRs berdasarkan user role
 */
export async function filterPRsByAccess(
  pullRequests: any[],
  user: any,
  repositoryName: string
) {
  const accessControl = await getGitHubAccessControl(user, repositoryName);
  
  return filterPullRequestsByRole(
    pullRequests,
    user,
    accessControl.canViewAllPRs
  );
}

/**
 * Helper untuk check merge permission
 */
export async function canMergePR(user: any, repositoryName: string) {
  const accessControl = await getGitHubAccessControl(user, repositoryName);
  return accessControl.canMergePR;
}

/**
 * Helper untuk check conflict resolution permission
 */
export async function canResolveConflicts(user: any, repositoryName: string) {
  const accessControl = await getGitHubAccessControl(user, repositoryName);
  return accessControl.canResolveConflicts;
}
