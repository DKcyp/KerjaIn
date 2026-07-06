import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/github/search-users?q=username - Search GitHub users
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Get GitHub token from database
    const credentials = await prisma.gitHubCredential.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: 'No GitHub credentials configured.' },
        { status: 400 }
      );
    }

    // Use the first (most recent) credential
    const token = credentials[0].token;

    // Search users via GitHub API
    const response = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to search users' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return simplified user data
    const users = data.items.map((user: any) => ({
      login: user.login,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      type: user.type,
    }));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
