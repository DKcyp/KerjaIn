import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, hasPermission } from '@/lib/auth';
import { getActiveTasks } from '@/lib/taskTimeTracker';

// GET /api/tasklist/active - Get all currently active tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    
    let userId: number | undefined;
    
    // If userId is specified, check permissions
    if (userIdParam) {
      const targetUserId = parseInt(userIdParam);
      
      // Users can always see their own active tasks
      if (targetUserId === session.user.id) {
        userId = targetUserId;
      } 
      // PM/Admin can see all users' active tasks
      else if (await hasPermission(session.user.id, 'task.read')) {
        userId = targetUserId;
      } 
      else {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } 
    // If no userId specified, show based on role
    else {
      // Regular users see only their own tasks
      if (session.user.role === 'PROGRAMMER') {
        userId = session.user.id;
      }
      // PM/Admin can see all active tasks (no userId filter)
      // userId remains undefined to show all
    }

    const activeTasks = await getActiveTasks(userId);

    return NextResponse.json({
      activeTasks,
      count: activeTasks.length,
      userId: userId || null
    });

  } catch (error) {
    console.error('Error getting active tasks:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
