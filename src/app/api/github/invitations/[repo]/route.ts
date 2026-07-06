import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/github/invitations/[repo] - List pending invitations
export async function GET(
  _req: NextRequest,
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
        error: 'No GitHub credentials configured.' 
      }, { status: 400 });
    }

    // Use the first (most recent) credential
    const token = credentials[0].token;

    // Fetch pending invitations from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/invitations`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Repository not found or no invitations endpoint access
        return NextResponse.json({ invitations: [] });
      }
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to fetch invitations' },
        { status: response.status }
      );
    }

    const invitations = await response.json();

    return NextResponse.json({ invitations });
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/github/invitations/[repo]?invitationId=xxx - Cancel invitation
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
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    console.log('[Cancel Invitation] Request:', { repoName, invitationId });

    // Get GitHub token from database
    const credentials = await prisma.gitHubCredential.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (credentials.length === 0) {
      return NextResponse.json({ 
        error: 'No GitHub credentials configured.' 
      }, { status: 400 });
    }

    // Use the first (most recent) credential
    const token = credentials[0].token;

    // Cancel invitation via GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${repoName}/invitations/${invitationId}`,
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
      console.error('[Cancel Invitation] GitHub API error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to cancel invitation' },
        { status: response.status }
      );
    }

    console.log('[Cancel Invitation] Success');

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
