import { sendNotificationToUser, NotificationEvent, NotificationEventType } from './pusher-server';
import { prisma } from './prisma';

interface SendTaskNotificationParams {
  type: NotificationEventType;
  taskId?: number;
  taskCode?: string;
  projectId?: number;
  projectName?: string;
  fromUserId?: number;
  fromUserName?: string;
  toUserId: number;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  data?: Record<string, unknown>;
}

export async function sendTaskNotification(params: SendTaskNotificationParams) {
  try {
    const notification: NotificationEvent = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      title: params.title,
      message: params.message,
      taskId: params.taskId,
      taskCode: params.taskCode,
      projectId: params.projectId,
      projectName: params.projectName,
      fromUserId: params.fromUserId,
      fromUserName: params.fromUserName,
      timestamp: new Date().toISOString(),
      priority: params.priority || 'medium',
      data: params.data,
    };

    await sendNotificationToUser(params.toUserId, notification);

    // Save to database for persistence (notifications appear after login)
    await saveNotificationToDatabase({
      userId: params.toUserId,
      type: params.type,
      title: params.title,
      message: params.message,
      taskId: params.taskId,
      taskCode: params.taskCode,
      projectId: params.projectId,
      projectName: params.projectName,
      fromUserId: params.fromUserId,
      fromUserName: params.fromUserName,
      priority: params.priority || 'medium',
      requestId: notification.id, // Prevent duplicates
      data: params.data
    });

    return notification;
  } catch (error) {
    console.error('Failed to send task notification:', error);
    throw error;
  }
}

// Helper to get user and project info for notifications
export async function getNotificationContext(taskId: number) {
  const task = await prisma.tasklist.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      kode: true,
      projectId: true,
      pegawaiId: true,
      status: true,
      keterangan: true,
    },
  });

  if (!task) return null;

  // Get related data separately
  const [pegawai, proyek] = await Promise.all([
    prisma.pegawai.findUnique({
      where: { id: task.pegawaiId },
      select: { id: true, namaLengkap: true },
    }),
    prisma.proyek.findUnique({
      where: { id: task.projectId },
      select: { id: true, namaProyek: true },
    }),
  ]);

  return {
    ...task,
    pegawai,
    proyek,
  };
}

// Helper function to find and notify PM for a project
export async function notifyProjectPM(params: {
  projectId: number;
  taskId: number;
  taskCode: string;
  notificationType: NotificationEventType;
  templateKey: keyof typeof notificationTemplates;
  templateArgs: string[];
  fromUserId?: number;
  fromUserName?: string;
  priority?: 'low' | 'medium' | 'high';
}) {
  try {
    // Find PM for this project with proper type handling
    const pmTeam = await prisma.proyekTeam.findFirst({
      where: {
        projectId: params.projectId
      }
    });

    if (!pmTeam) {
      console.log(`[PM Notification] No PM found for project ${params.projectId}`);
      return null;
    }

    // Get PM details with pegawai data
    const pmWithDetails = await prisma.pegawai.findUnique({
      where: { id: pmTeam.pegawaiId },
      select: { id: true, namaLengkap: true }
    });

    if (!pmWithDetails) {
      console.log(`[PM Notification] PM ${pmTeam.pegawaiId} not found`);
      return null;
    }

    // Get project info
    const project = await prisma.proyek.findUnique({
      where: { id: params.projectId },
      select: { namaProyek: true }
    });

    if (!project) {
      console.log(`[PM Notification] Project ${params.projectId} not found`);
      return null;
    }

    // Generate notification template
    const templateFunction = notificationTemplates[params.templateKey] as (...args: string[]) => { title: string; message: string; priority: 'low' | 'medium' | 'high' };
    const template = templateFunction(...params.templateArgs);

    // Send notification to PM
    await sendTaskNotification({
      type: params.notificationType,
      taskId: params.taskId,
      taskCode: params.taskCode,
      projectId: params.projectId,
      projectName: project.namaProyek,
      fromUserId: params.fromUserId,
      fromUserName: params.fromUserName,
      toUserId: pmTeam.pegawaiId,
      title: template.title,
      message: template.message,
      priority: params.priority || template.priority,
    });

    console.log(`[PM Notification] Sent ${params.notificationType} to PM: ${pmWithDetails.namaLengkap} for task: ${params.taskCode}`);
    return pmWithDetails;
  } catch (error) {
    console.error('[PM Notification] Failed to send notification:', error);
    return null;
  }
}

// Smart chat notification with grouping
export async function sendSmartChatNotification(params: {
  taskId: number;
  taskCode: string;
  projectId: number;
  projectName?: string;
  senderId: number;
  senderName: string;
  message: string;
  recipients: number[]; // Array of user IDs to notify
  currentMessageId?: number; // ID of the current message to exclude from count
}) {
  try {
    console.log(`[Smart Chat] Starting notification for task ${params.taskCode}, recipients:`, params.recipients);
    console.log(`[Smart Chat] Current message ID to exclude:`, params.currentMessageId);

    // For each recipient, check if there's a recent chat notification from the same sender for the same task
    for (const recipientId of params.recipients) {
      // Skip if sender is the recipient
      if (recipientId === params.senderId) {
        console.log(`[Smart Chat] Skipping sender ${params.senderId}`);
        continue;
      }

      // Create a unique notification ID for this task-sender-recipient combination
      const notificationId = `chat-${params.taskId}-${params.senderId}-${recipientId}`;

      // Check if there's a recent notification (within last 5 minutes) that we can update
      const recentTimeThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

      // For now, we'll send a new notification each time but with smart message count
      // In a real implementation, you might want to store notification state in Redis or database

      // Count recent messages from this sender in this task (last 5 minutes, excluding current message)
      const whereClause = {
        tasklistId: params.taskId,
        senderId: params.senderId,
        createdAt: {
          gte: recentTimeThreshold
        },
        ...(params.currentMessageId && {
          id: {
            not: params.currentMessageId
          }
        })
      };

      const recentMessageCount = await prisma.tasklistChat.count({
        where: whereClause
      });

      // Add 1 to include the current message in the count
      const totalMessageCount = recentMessageCount + 1;

      console.log(`[Smart Chat] For recipient ${recipientId}: recent=${recentMessageCount}, total=${totalMessageCount}`);

      // Use the appropriate template based on message count
      const template = notificationTemplates['task.chat.new'](
        params.taskCode,
        params.senderName,
        totalMessageCount
      );

      await sendTaskNotification({
        type: 'task.comment', // Use existing type for compatibility
        taskId: params.taskId,
        taskCode: params.taskCode,
        projectId: params.projectId,
        projectName: params.projectName,
        fromUserId: params.senderId,
        fromUserName: params.senderName,
        toUserId: recipientId,
        title: template.title,
        message: template.message,
        priority: template.priority,
        data: {
          messageCount: totalMessageCount,
          notificationId: notificationId,
          isGrouped: totalMessageCount > 1
        }
      });
    }

    console.log(`[Smart Chat] Sent notifications to ${params.recipients.length} recipients for task ${params.taskCode}`);
  } catch (error) {
    console.error('[Smart Chat] Failed to send chat notifications:', error);
    // Don't throw error to avoid breaking chat functionality
  }
}

// Send chat notification to task creator (PM/SUPER_ADMIN who created the task)
export async function notifyPMForChat(params: {
  taskId: number;
  taskCode: string;
  projectId: number;
  senderId: number;
  senderName: string;
  message: string;
}) {
  try {
    console.log(`[Task Creator Chat Notification] Starting for task ${params.taskCode}`);

    // Get task to find creator
    const task = await prisma.tasklist.findUnique({
      where: { id: params.taskId },
      select: { createdBy: true }
    });

    if (!task || !task.createdBy) {
      console.log(`[Task Creator Chat Notification] No task creator found for task ${params.taskId}`);
      return null;
    }

    // Skip if creator is the sender
    if (task.createdBy === params.senderId) {
      console.log(`[Task Creator Chat Notification] Skipping - creator is the sender`);
      return null;
    }

    console.log(`[Task Creator Chat Notification] Found task creator (ID: ${task.createdBy})`);

    // Get creator details
    const creatorDetails = await prisma.pegawai.findUnique({
      where: { id: task.createdBy },
      select: { id: true, namaLengkap: true }
    });

    if (!creatorDetails) {
      console.log(`[Task Creator Chat Notification] Creator ${task.createdBy} not found`);
      return null;
    }

    // Get project info
    const project = await prisma.proyek.findUnique({
      where: { id: params.projectId },
      select: { namaProyek: true }
    });

    if (!project) {
      console.log(`[Task Creator Chat Notification] Project ${params.projectId} not found`);
      return null;
    }

    // Count recent messages from this sender in this task (last 5 minutes, excluding current message)
    const recentTimeThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const recentMessageCount = await prisma.tasklistChat.count({
      where: {
        tasklistId: params.taskId,
        senderId: params.senderId,
        createdAt: {
          gte: recentTimeThreshold,
          lt: new Date()
        }
      }
    });

    // Add 1 to include the current message in the count
    const totalMessageCount = recentMessageCount + 1;

    // Use PM-specific template
    const template = notificationTemplates['pm.task.chat'](
      params.taskCode,
      project.namaProyek || 'Unknown Project',
      params.senderName,
      totalMessageCount
    );

    // Send notification to task creator
    await sendTaskNotification({
      type: 'task.comment',
      taskId: params.taskId,
      taskCode: params.taskCode,
      projectId: params.projectId,
      projectName: project.namaProyek,
      fromUserId: params.senderId,
      fromUserName: params.senderName,
      toUserId: task.createdBy,
      title: template.title,
      message: template.message,
      priority: template.priority,
      data: {
        messageCount: totalMessageCount,
        isPMNotification: true,
        isGrouped: totalMessageCount > 1
      }
    });

    console.log(`[Task Creator Chat Notification] Sent to creator: ${creatorDetails.namaLengkap} for task: ${params.taskCode} (${totalMessageCount} messages)`);
    return creatorDetails;
  } catch (error) {
    console.error('[Task Creator Chat Notification] Failed to send notification:', error);
    return null;
  }
}

// Notification templates for different task events
export const notificationTemplates = {
  'task.created': (taskCode: string, projectName: string, creatorName: string) => ({
    title: 'Task Baru Dibuat',
    message: `Task ${taskCode} telah dibuat di proyek ${projectName} oleh ${creatorName}`,
    priority: 'medium' as const,
  }),

  'task.assigned': (taskCode: string, projectName: string, assignerName: string) => ({
    title: 'Task Ditugaskan',
    message: `Anda mendapat task baru ${taskCode} di proyek ${projectName} dari ${assignerName}`,
    priority: 'high' as const,
  }),

  'task.status.changed': (taskCode: string, oldStatus: string, newStatus: string) => ({
    title: 'Status Task Berubah',
    message: `Status task ${taskCode} berubah dari ${oldStatus} ke ${newStatus}`,
    priority: 'medium' as const,
  }),

  'task.submitted': (taskCode: string, projectName: string, submitterName: string) => ({
    title: 'Task Disubmit untuk Review',
    message: `Task ${taskCode} di proyek ${projectName} telah disubmit oleh ${submitterName}`,
    priority: 'high' as const,
  }),

  'task.approved': (taskCode: string, approverName: string) => ({
    title: 'Task Disetujui',
    message: `Task ${taskCode} Anda telah disetujui oleh ${approverName}`,
    priority: 'medium' as const,
  }),

  'task.rejected': (taskCode: string, rejectorName: string, reason?: string) => ({
    title: 'Task Ditolak',
    message: `Task ${taskCode} Anda ditolak oleh ${rejectorName}${reason ? `: ${reason}` : ''}`,
    priority: 'high' as const,
  }),

  'task.updated': (taskCode: string, updaterName: string) => ({
    title: 'Task Diupdate',
    message: `Task ${taskCode} telah diupdate oleh ${updaterName}`,
    priority: 'low' as const,
  }),

  'task.comment': (taskCode: string, commenterName: string) => ({
    title: 'Komentar Baru',
    message: `${commenterName} menambahkan komentar di task ${taskCode}`,
    priority: 'medium' as const,
  }),

  'task.chat.new': (taskCode: string, senderName: string, messageCount: number = 1) => ({
    title: messageCount > 1 ? `${messageCount} Pesan Baru` : 'Pesan Baru',
    message: messageCount > 1
      ? `${senderName} mengirim ${messageCount} pesan di task ${taskCode}`
      : `${senderName} mengirim pesan di task ${taskCode}`,
    priority: 'medium' as const,
  }),

  'pm.task.chat': (taskCode: string, projectName: string, senderName: string, messageCount: number = 1) => ({
    title: messageCount > 1 ? `${messageCount} Pesan Baru di Task` : 'Pesan Baru di Task',
    message: messageCount > 1
      ? `${senderName} mengirim ${messageCount} pesan di task ${taskCode} (${projectName})`
      : `${senderName} mengirim pesan di task ${taskCode} (${projectName})`,
    priority: 'medium' as const,
  }),

  'task.file.uploaded': (taskCode: string, uploaderName: string, fileName: string) => ({
    title: 'File Baru Diupload',
    message: `${uploaderName} mengupload file ${fileName} di task ${taskCode}`,
    priority: 'low' as const,
  }),

  'task.overdue': (taskCode: string, projectName: string) => ({
    title: 'Task Melewati Deadline',
    message: `Task ${taskCode} di proyek ${projectName} telah melewati deadline`,
    priority: 'high' as const,
  }),

  'task.deleted': (taskCode: string, deleterName: string) => ({
    title: 'Task Dihapus',
    message: `Task ${taskCode} telah dihapus oleh ${deleterName}`,
    priority: 'medium' as const,
  }),

  // PM-specific notification templates
  'pm.task.started': (taskCode: string, projectName: string, assigneeName: string) => ({
    title: 'Task Dimulai',
    message: `${assigneeName} telah memulai mengerjakan task ${taskCode} di proyek ${projectName}`,
    priority: 'medium' as const,
  }),

  'pm.task.paused': (taskCode: string, projectName: string, assigneeName: string) => ({
    title: 'Task Dihentikan Sementara',
    message: `${assigneeName} menghentikan sementara task ${taskCode} di proyek ${projectName}`,
    priority: 'medium' as const,
  }),

  'pm.task.resumed': (taskCode: string, projectName: string, assigneeName: string) => ({
    title: 'Task Dilanjutkan',
    message: `${assigneeName} melanjutkan kembali task ${taskCode} di proyek ${projectName}`,
    priority: 'medium' as const,
  }),

  'pm.task.completed': (taskCode: string, projectName: string, assigneeName: string) => ({
    title: 'Task Selesai',
    message: `Task ${taskCode} di proyek ${projectName} telah diselesaikan oleh ${assigneeName}`,
    priority: 'high' as const,
  }),

  'pm.task.needs.attention': (taskCode: string, projectName: string, reason: string) => ({
    title: 'Task Memerlukan Perhatian',
    message: `Task ${taskCode} di proyek ${projectName} memerlukan perhatian: ${reason}`,
    priority: 'high' as const,
  }),
};

export async function notifyCreatorAndPM(params: {
  taskId: number;
  eventType: NotificationEventType;
  template: { title: string; message: string; priority: 'low' | 'medium' | 'high' };
  fromUserId: number;
  fromUserName: string;
}) {
  try {
    console.log(`🔔 [notifyCreatorAndPM] Starting for task ${params.taskId}, event: ${params.eventType}`);

    const task = await prisma.tasklist.findUnique({
      where: { id: params.taskId },
      select: { createdBy: true, pegawaiId: true, projectId: true, kode: true }
    });

    if (!task) {
      console.log(`⚠️ [notifyCreatorAndPM] Task ${params.taskId} not found`);
      return;
    }

    console.log(`📋 [notifyCreatorAndPM] Task info:`, {
      taskId: params.taskId,
      createdBy: task.createdBy,
      assignee: task.pegawaiId,
      fromUserId: params.fromUserId,
      projectId: task.projectId
    });

    const proyek = await prisma.proyek.findUnique({
      where: { id: task.projectId },
      select: { namaProyek: true }
    });

    const recipients = new Set<number>();

    // Add task creator (PM/SUPER_ADMIN who created the task)
    if (task.createdBy && task.createdBy !== params.fromUserId) {
      recipients.add(task.createdBy);
      console.log(`  ✅ Adding task creator: ${task.createdBy}`);
    } else if (task.createdBy === params.fromUserId) {
      console.log(`  ⏭️ Skipping task creator: ${task.createdBy} (is sender)`);
    } else {
      console.log(`  ⚠️ No task creator found for task ${params.taskId}`);
    }

    // Add assignee (pegawaiId)
    if (task.pegawaiId && task.pegawaiId !== params.fromUserId) {
      recipients.add(task.pegawaiId);
      console.log(`  ✅ Adding assignee: ${task.pegawaiId}`);
    } else {
      console.log(`  ⏭️ Skipping assignee: ${task.pegawaiId} (is sender)`);
    }

    // Add project PMs (anyone in ProyekTeam with jabatan containing 'PM')
    // This covers cases where the task was NOT created by the project PM
    // (e.g. created by SUPER_ADMIN, or by a programmer themselves).
    try {
      const projectPMs = await prisma.proyekTeam.findMany({
        where: {
          projectId: task.projectId,
          jabatan: { contains: 'PM', mode: 'insensitive' },
        },
        select: { pegawaiId: true },
      });
      for (const pm of projectPMs) {
        if (pm.pegawaiId && pm.pegawaiId !== params.fromUserId) {
          if (!recipients.has(pm.pegawaiId)) {
            recipients.add(pm.pegawaiId);
            console.log(`  ✅ Adding project PM: ${pm.pegawaiId}`);
          }
        }
      }
    } catch (pmLookupError) {
      console.error(`⚠️ [notifyCreatorAndPM] Failed to look up project PMs:`, pmLookupError);
    }

    console.log(`🎯 [notifyCreatorAndPM] Total recipients: ${recipients.size} - [${Array.from(recipients).join(', ')}]`);

    if (recipients.size === 0) {
      console.log(`⚠️ [notifyCreatorAndPM] No recipients to notify`);
      return;
    }

    const requestId = `${params.taskId}-${params.eventType}-${Date.now()}`;

    for (const userId of recipients) {
      console.log(`  📤 Sending to user ${userId}...`);

      // ✅ FIX: Remove duplicate saveNotificationToDatabase call
      // sendTaskNotification already saves to database internally
      await sendTaskNotification({
        type: params.eventType, taskId: params.taskId, taskCode: task.kode,
        projectId: task.projectId, projectName: proyek?.namaProyek,
        fromUserId: params.fromUserId, fromUserName: params.fromUserName,
        toUserId: userId, title: params.template.title,
        message: params.template.message, priority: params.template.priority
      });

      console.log(`  ✅ Sent to user ${userId}`);
    }

    console.log(`🎉 [notifyCreator] Completed for task ${params.taskId}`);
  } catch (error) {
    console.error('❌ [notifyCreator] Error:', error);
  }
}

export async function saveNotificationToDatabase(params: {
  userId: number;
  type: string;
  title: string;
  message: string;
  taskId?: number;
  taskCode?: string;
  projectId?: number;
  projectName?: string;
  fromUserId?: number;
  fromUserName?: string;
  priority: string;
  requestId?: string;
  data?: any;
}) {
  try {
    if (params.requestId) {
      const exists = await prisma.notification.findFirst({
        where: { userId: params.userId, requestId: params.requestId }
      });
      if (exists) {
        console.log(`[Save Notification] Duplicate prevented: ${params.requestId}`);
        return exists;
      }
    }

    const notificationData: any = {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      taskCode: params.taskCode,
      projectId: params.projectId,
      projectName: params.projectName,
      fromUserId: params.fromUserId,
      fromUserName: params.fromUserName,
      priority: params.priority,
      requestId: params.requestId,
      isRead: false
    };

    // Only add taskId if it's a valid number (not 0 or undefined)
    if (params.taskId && params.taskId > 0) {
      notificationData.taskId = params.taskId;
    }

    // Add data field if provided
    if (params.data) {
      notificationData.data = params.data;
    }

    const saved = await prisma.notification.create({
      data: notificationData
    });

    console.log(`[Save Notification] Saved to DB: ${saved.id} for user ${params.userId}`);
    return saved;
  } catch (error) {
    console.error('Save notification error:', error);
    return null;
  }
}

export async function logTaskActivity(params: {
  taskId: number;
  userId: number;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    return await prisma.taskActivity.create({
      data: {
        taskId: params.taskId, userId: params.userId, action: params.action,
        fromStatus: params.fromStatus, toStatus: params.toStatus, note: params.note,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null
      }
    });
  } catch (error) {
    console.error('Log activity error:', error);
    return null;
  }
}

// PR Update Notification Helper
export async function notifyPRUpdate(params: {
  prNumber: number;
  prTitle: string;
  prBody?: string;
  repo: string;
  action: 'merged' | 'closed';
  actorName: string;
  actorId?: number;
}) {
  try {
    console.log(`🔔 [notifyPRUpdate] Starting for PR #${params.prNumber} (${params.action})`);

    let programmerId: number | undefined;
    let taskCode: string | undefined;
    let projectId: number | undefined;
    let projectName: string | undefined;
    let taskId: number | undefined;

    // Strategy 1: Find original "PR Created" notification to identify the creator
    console.log('🔍 [notifyPRUpdate] Strategy 1: Looking up original PR creator from notifications...');

    // We fetch recent PR created notifications to find the match
    // Note: Prisma JSON filtering varies by DB, so we filter in memory for safety
    const recentNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { type: 'github.pr.created' },
          { type: 'task.created' }  // Also check task.created as PR notifications might use this type
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { fromUserId: true, data: true, taskCode: true, taskId: true, projectId: true, projectName: true }
    });

    // Find notification where data.prNumber matches and has isPRNotification flag
    const originalNotif = recentNotifications.find(n => {
      const data = n.data as any;
      // Check if it's a PR notification and matches the PR number
      if (!data?.isPRNotification) return false;
      
      // Strict match or contains matches
      return data?.prNumber === params.prNumber &&
        (data?.repo === params.repo || data?.repoName === params.repo || (data?.repo && params.repo.includes(data.repo)) || (data?.repo && params.repo.endsWith(data.repo)));
    });

    if (originalNotif && originalNotif.fromUserId) {
      console.log(`✅ [notifyPRUpdate] Found original creator: User ID ${originalNotif.fromUserId}`);
      programmerId = originalNotif.fromUserId;
      taskCode = originalNotif.taskCode || undefined;
      taskId = originalNotif.taskId || undefined;
      projectId = originalNotif.projectId || undefined;
      projectName = originalNotif.projectName || undefined;
    } else {
      console.log('⚠️ [notifyPRUpdate] Original notification not found. Trying Strategy 2...');
    }

    // Strategy 2: Parse Task Code from Title (Fallback)
    if (!programmerId) {
      console.log('🔍 [notifyPRUpdate] Strategy 2: Parsing Task Code from title/body...');
      // Regex matches patterns like [PROJ-123], PROJ-123, task-123 etc.
      const taskCodeRegex = /\[?([A-Za-z]+-\d+)\]?/;
      let taskCodeMatch = params.prTitle.match(taskCodeRegex);

      if (!taskCodeMatch && params.prBody) {
        taskCodeMatch = params.prBody.match(taskCodeRegex);
      }

      if (taskCodeMatch) {
        taskCode = taskCodeMatch[1].toUpperCase();
        console.log(`📋 [notifyPRUpdate] Found Task Code: ${taskCode}`);

        // Find Task
        const task = await prisma.tasklist.findFirst({
          where: { kode: taskCode },
          include: {
            module: { select: { projectId: true } }
          }
        });

        if (task) {
          programmerId = task.pegawaiId;
          taskId = task.id;
          projectId = task.projectId;

          // Get Project Info if needed
          if (projectId) {
            const project = await prisma.proyek.findUnique({
              where: { id: projectId },
              select: { namaProyek: true }
            });
            projectName = project?.namaProyek;
          }
        } else {
          console.log(`⚠️ [notifyPRUpdate] Task ${taskCode} not found in database`);
        }
      } else {
        console.log('⚠️ [notifyPRUpdate] No Task Code found in PR title or body');
      }
    }

    if (!programmerId) {
      console.error('❌ [notifyPRUpdate] Could not identify Programmer (Recipient) for notification.');
      return;
    }

    // Skip if actor is the programmer (e.g. programmer merged/closed their own PR)
    if (params.actorId && programmerId === params.actorId) {
      console.log(`⏭️ [notifyPRUpdate] Skipping notification (Actor is the PR Creator)`);
      return;
    }

    // 4. Send Notification
    const type: NotificationEventType = params.action === 'merged' ? 'github.pr.merged' : 'github.pr.closed';
    const title = params.action === 'merged' ? 'Pull Request Di-Merge' : 'Pull Request Ditutup';
    // Use taskCode in message if available, otherwise just PR number
    const message = params.action === 'merged'
      ? `PR #${params.prNumber} ${taskCode ? `(${taskCode}) ` : ''}telah di-merge oleh ${params.actorName}`
      : `PR #${params.prNumber} ${taskCode ? `(${taskCode}) ` : ''}telah ditutup oleh ${params.actorName}`;

    await sendTaskNotification({
      type,
      taskId: taskId && taskId > 0 ? taskId : undefined, // Only pass if valid
      taskCode: taskCode,
      projectId: projectId,
      projectName: projectName,
      toUserId: programmerId,
      title,
      message,
      priority: 'medium',
      fromUserId: params.actorId,
      fromUserName: params.actorName,
      data: {
        prNumber: params.prNumber,
        repo: params.repo,
        action: params.action,
        isPRNotification: true
      }
    });

    console.log(`✅ [notifyPRUpdate] Notification sent to programmer (ID: ${programmerId})`);

  } catch (error) {
    console.error('❌ [notifyPRUpdate] Error:', error);
  }
}
