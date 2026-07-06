import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, hasPermission } from '@/lib/auth';
import { checkSLACompliance } from '@/lib/slaMonitoringService';

export const runtime = 'nodejs';

// POST /api/sla/monitor
// Manually trigger SLA compliance check - requires system.manage permission
export async function POST(_req: NextRequest) {
  try {
    // Check authentication and permissions
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow system admins or super admins to trigger SLA monitoring
    if (!(await hasPermission(session.user.id, 'system.manage'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const result = await checkSLACompliance();
    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/sla/monitor error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/sla/monitor
// Get SLA monitoring status and recent activity - requires system.read permission
export async function GET(_req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!(await hasPermission(session.user.id, 'system.read'))) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Get recent SLA monitoring activity (if table exists)
    let recentActivity = [];
    try {
      const { prisma } = await import('@/lib/prisma');
      recentActivity = await prisma.$queryRaw<any[]>`
        SELECT 
          "taskId",
          "pegawaiId", 
          "notificationType",
          "sentAt",
          "messageId"
        FROM sla_notification_log 
        ORDER BY "sentAt" DESC 
        LIMIT 50
      `;
    } catch (error) {
      // Table might not exist yet
      console.log('SLA notification log table not available yet');
    }

    return NextResponse.json({
      recentNotifications: recentActivity,
      lastCheck: new Date().toISOString(),
      monitoringEnabled: true, // Always enabled since we use existing wa.expressa.id service
      whatsappService: 'wa.expressa.id'
    });
    
  } catch (e) {
    console.error('GET /api/sla/monitor error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
