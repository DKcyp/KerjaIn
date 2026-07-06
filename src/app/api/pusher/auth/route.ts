import { NextRequest, NextResponse } from 'next/server';
import { getPusherServer } from '@/lib/pusher-server';
import { parseSessionFromCookieHeader } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const session = parseSessionFromCookieHeader(cookieHeader);

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify user has access to this channel
    console.log('🔐 [Pusher Auth] Request:', {
      userId: session.id,
      channelName,
      socketId
    });

    // Allow two types of channels:
    // 1. private-user-{userId} - for user-specific notifications
    // 2. private-task-{taskId} - for task-specific chat

    const isUserChannel = channelName === `private-user-${session.id}`;
    const isTaskChannel = channelName.startsWith('private-task-');

    if (!isUserChannel && !isTaskChannel) {
      console.error('❌ [Pusher Auth] Forbidden - invalid channel:', {
        requested: channelName,
        userId: session.id
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pusher = getPusherServer();
    const authResponse = pusher.authorizeChannel(socketId, channelName);

    console.log('✅ [Pusher Auth] Channel authorized:', {
      userId: session.id,
      channelName,
      channelType: isUserChannel ? 'user' : 'task',
      socketId
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
