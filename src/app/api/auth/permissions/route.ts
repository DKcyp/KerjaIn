import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, getUserPermissions } from '@/lib/auth';

// GET /api/auth/permissions - Get current user's permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await getUserPermissions(session.user.id);

    return NextResponse.json({ 
      permissions,
      user: {
        id: session.user.id,
        role: session.user.role,
        namaLengkap: session.user.namaLengkap,
        username: session.user.username
      }
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
