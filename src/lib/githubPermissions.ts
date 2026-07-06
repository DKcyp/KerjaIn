import { prisma } from '@/lib/prisma';
import type { AuthUser } from './auth';

export interface GitHubAccessControl {
  canViewRepository: boolean;
  canViewAllPRs: boolean;
  canMergePR: boolean;
  canResolveConflicts: boolean;
  canCreatePR: boolean;
  allowedRepositories: string[];
}

/**
 * Get user's project IDs based on team membership
 */
export async function getUserProjectIds(userId: number): Promise<number[]> {
  try {
    const projectTeams = await prisma.proyekTeam.findMany({
      where: { pegawaiId: userId },
      select: { projectId: true },
    });

    return projectTeams.map(pt => pt.projectId);
  } catch (error) {
    console.error('Error getting user project IDs:', error);
    return [];
  }
}

/**
 * Get repositories accessible by user based on their project membership
 */
export async function getUserAccessibleRepositories(userId: number, role: string): Promise<string[]> {
  try {
    // Super Admin can access all repositories
    if (role === 'SUPER_ADMIN') {
      const allRepos = await (prisma as any).gitHubRepository.findMany({
        select: { repositoryName: true },
      });
      return allRepos.map((r: any) => r.repositoryName);
    }

    // Get user's project IDs
    const projectIds = await getUserProjectIds(userId);

    if (projectIds.length === 0) {
      return [];
    }

    // Get repositories for those projects
    const repos = await (prisma as any).gitHubRepository.findMany({
      where: {
        projectId: { in: projectIds },
      },
      select: { repositoryName: true },
    });

    return repos.map((r: any) => r.repositoryName);
  } catch (error) {
    console.error('Error getting accessible repositories:', error);
    return [];
  }
}

/**
 * Check if user can discover (view) a repository
 * PMs can see all repos from all credentials for discovery
 * Others need project mapping
 */
export async function canDiscoverRepository(
  userId: number,
  role: string,
  repositoryName: string
): Promise<boolean> {
  try {
    // Super Admin can see all
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    // PM can see all repos from all credentials (for discovery)
    if (role === 'PM') {
      return true;
    }

    // Programmers and others need project mapping
    return canAccessRepository(userId, role, repositoryName);
  } catch (error) {
    console.error('Error checking repository discovery access:', error);
    return false;
  }
}

/**
 * Check if user can access a specific repository
 */
export async function canAccessRepository(
  userId: number,
  role: string,
  repositoryName: string
): Promise<boolean> {
  try {
    // Super Admin can access all repositories
    if (role === 'SUPER_ADMIN') {
      return true;
    }

    // Get repository's project
    const repo = await (prisma as any).gitHubRepository.findUnique({
      where: { repositoryName },
      select: { projectId: true },
    });

    if (!repo) {
      // Repository not mapped to any project - deny access
      return false;
    }

    // Check if user is in the project team
    const teamMember = await prisma.proyekTeam.findFirst({
      where: {
        projectId: repo.projectId,
        pegawaiId: userId,
      },
    });

    return !!teamMember;
  } catch (error) {
    console.error('Error checking repository access:', error);
    return false;
  }
}

/**
 * Get GitHub access control for a user
 */
export async function getGitHubAccessControl(
  user: AuthUser,
  repositoryName?: string
): Promise<GitHubAccessControl> {
  const role = user.role;

  // Super Admin has full access
  if (role === 'SUPER_ADMIN') {
    return {
      canViewRepository: true,
      canViewAllPRs: true,
      canMergePR: true,
      canResolveConflicts: true,
      canCreatePR: true,
      allowedRepositories: [], // Empty means all
    };
  }

  // Get accessible repositories
  const allowedRepositories = await getUserAccessibleRepositories(user.id, role);

  // Check repository-specific access
  const canViewRepository = repositoryName
    ? await canAccessRepository(user.id, role, repositoryName)
    : allowedRepositories.length > 0;

  // PM/PIC permissions
  if (role === 'PM') {
    return {
      canViewRepository,
      canViewAllPRs: true, // Can see all PRs in their projects
      canMergePR: true,
      canResolveConflicts: true,
      canCreatePR: true,
      allowedRepositories,
    };
  }

  // Programmer permissions
  if (role === 'PROGRAMMER') {
    return {
      canViewRepository,
      canViewAllPRs: false, // Can only see their own PRs
      canMergePR: false,
      canResolveConflicts: false,
      canCreatePR: true,
      allowedRepositories,
    };
  }

  // Default: no access
  return {
    canViewRepository: false,
    canViewAllPRs: false,
    canMergePR: false,
    canResolveConflicts: false,
    canCreatePR: false,
    allowedRepositories: [],
  };
}

/**
 * Filter pull requests based on user role and permissions
 */
export function filterPullRequestsByRole(
  pullRequests: any[],
  user: AuthUser,
  canViewAllPRs: boolean
): any[] {
  // If user can view all PRs, return all
  if (canViewAllPRs) {
    return pullRequests;
  }

  // Programmers can only see their own PRs
  // Match by GitHub username (assuming it matches system username)
  const username = user.username?.toLowerCase();

  return pullRequests.filter(pr => {
    const prAuthor = pr.user?.login?.toLowerCase();
    return prAuthor === username;
  });
}

/**
 * Get repository name from full name (owner/repo -> repo)
 */
export function getRepositoryName(fullName: string): string {
  const parts = fullName.split('/');
  return parts[parts.length - 1];
}

/**
 * Map repository to project
 */
export async function mapRepositoryToProject(
  projectId: number,
  repositoryName: string,
  repositoryFullName: string
): Promise<void> {
  try {
    // Since projectId is unique, we need to upsert by projectId
    // This will update the existing mapping or create a new one
    await (prisma as any).gitHubRepository.upsert({
      where: { projectId },
      update: {
        repositoryName,
        repositoryFullName,
        updatedAt: new Date(),
      },
      create: {
        projectId,
        repositoryName,
        repositoryFullName,
      },
    });
  } catch (error) {
    console.error('Error mapping repository to project:', error);
    throw error;
  }
}

/**
 * Get project ID for a repository
 */
export async function getRepositoryProjectId(repositoryName: string): Promise<number | null> {
  try {
    const repo = await (prisma as any).gitHubRepository.findUnique({
      where: { repositoryName },
      select: { projectId: true },
    });

    return repo?.projectId || null;
  } catch (error) {
    console.error('Error getting repository project ID:', error);
    return null;
  }
}
