import { NextRequest, NextResponse } from 'next/server';
import { checkSLACompliance } from '@/lib/slaMonitoringService';

export const runtime = 'nodejs';

// GET /api/cron/sla-monitor
// Cron endpoint that triggers SLA monitoring - can be called by external cron services
export async function GET(_req: NextRequest) {
  try {
    const result = await checkSLACompliance();
    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/cron/sla-monitor error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/cron/sla-monitor
// Alternative endpoint for POST-based cron services
export async function POST(_req: NextRequest) {
  try {
    const result = await checkSLACompliance();
    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/cron/sla-monitor error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
