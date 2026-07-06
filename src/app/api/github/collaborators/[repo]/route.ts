import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/github/collaborators/[repo] - List collaborators
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ repo: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { repo } = await context.params;
    const repoName = decodeURIComponent(repo);

    // Get GitHub token from database
    const credentials = await prisma.gitHubCredential.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (credentials.length === 0) {
      return NextResponse.json({ 
        error: 'No GitHub credentials configured. Please add credentials in Master GitHub.' 
      }, { status: 400 });
    }

    // Use the first (most recent) credential
    const token = credentials[0].token;

    // Fetch collaborators from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/collaborators`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to fetch collaborators' },
        { status: response.status }
      );
    }

    const collaborators = await response.json();

    return NextResponse.json({ collaborators });
  } catch (error: any) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/github/collaborators/[repo] - Add collaborator (send invitation)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ repo: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { repo } = await context.params;
    const repoName = decodeURIComponent(repo);

    const body = await req.json();
    const { username, permission = 'push' } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    console.log('[Add Collaborator] Request:', { username, permission, repoName });

    // Validate permission
    const validPermissions = ['pull', 'push', 'admin', 'maintain', 'triage'];
    if (!validPermissions.includes(permission)) {
      return NextResponse.json(
        { error: `Invalid permission. Must be one of: ${validPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    // Get GitHub token from database
    const credentials = await prisma.gitHubCredential.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (credentials.length === 0) {
      return NextResponse.json({ 
        error: 'No GitHub credentials configured. Please add credentials in Master GitHub.' 
      }, { status: 400 });
    }

    // Use the first (most recent) credential
    const token = credentials[0].token;

    // Add collaborator via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/collaborators/${username}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permission })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to add collaborator' },
        { status: response.status }
      );
    }

    // Response can be 201 (invitation sent) or 204 (already a collaborator, permission updated)
    const isInvitation = response.status === 201;
    
    return NextResponse.json({
      success: true,
      message: isInvitation 
        ? `Invitation sent to ${username}` 
        : `Permission updated for ${username}`,
      isInvitation
    });
  } catch (error: any) {
    console.error('Error adding collaborator:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/github/collaborators/[repo]?username=xxx - Remove collaborator
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ repo: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { repo } = await context.params;
    const repoName = decodeURIComponent(repo);

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Get GitHub token from database
    const credentials = await prisma.gitHubCredential.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (credentials.length === 0) {
      return NextResponse.json({ 
        error: 'No GitHub credentials configured. Please add credentials in Master GitHub.' 
      }, { status: 400 });
    }

    // Use the first (most recent) credential
    const token = credentials[0].token;

    // Remove collaborator via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/collaborators/${username}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to remove collaborator' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${username} removed from repository`
    });
  } catch (error: any) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
