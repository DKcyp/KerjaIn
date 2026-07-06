// Pusher server configuration
import Pusher from 'pusher';

let pusherServer: Pusher | null = null;

export const getPusherServer = () => {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
      useTLS: true
    });
  }

  return pusherServer;
};

// Notification event types
export type NotificationEventType =
  | 'task.created'
  | 'task.assigned'
  | 'task.updated'
  | 'task.status.changed'
  | 'task.submitted'
  | 'task.approved'
  | 'task.rejected'
  | 'task.comment'
  | 'task.file.uploaded'
  | 'task.overdue'
  | 'task.deleted'
  | 'system.announcement'
  | 'github.pr.created'
  | 'github.pr.merged'
  | 'github.pr.closed';

// Notification event data structure
export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  taskId?: number;
  taskCode?: string;
  projectId?: number;
  projectName?: string;
  fromUserId?: number;
  fromUserName?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  data?: Record<string, any>;
}

// Helper function to send notification to user
export const sendNotificationToUser = async (
  userId: number,
  event: NotificationEvent
) => {
  const pusher = getPusherServer();

  try {
    console.log(`🔔 [Pusher] Attempting to send notification:`, {
      userId,
      channel: `private-user-${userId}`,
      eventName: 'task-notification', // Single event name like chat
      eventType: event.type,
      title: event.title,
      message: event.message,
      taskId: event.taskId,
      taskCode: event.taskCode,
      timestamp: new Date().toISOString()
    });

    // Use single event name 'task-notification' and pass full event data
    // This matches the chat notification pattern
    const result = await pusher.trigger(
      `private-user-${userId}`,
      'task-notification',  // Single event name
      event                  // Full event data with type inside
    );

    console.log(`✅ [Pusher] Notification sent successfully:`, {
      userId,
      eventType: event.type,
      taskCode: event.taskCode,
      result
    });

    return result;
  } catch (error) {
    console.error(`❌ [Pusher] Failed to send notification:`, {
      userId,
      eventType: event.type,
      taskCode: event.taskCode,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

// Helper function to send system announcement
export const sendSystemAnnouncement = async (
  event: NotificationEvent
) => {
  const pusher = getPusherServer();

  try {
    await pusher.trigger('notifications', event.type, event);
    console.log('🔔 System announcement sent:', event.type);
  } catch (error) {
    console.error('🔔 Failed to send system announcement:', error);
    throw error;
  }
};
