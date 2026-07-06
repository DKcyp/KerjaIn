import { NextRequest, NextResponse } from 'next/server';
import { sendTodaySummary } from '@/lib/todaySummary';

export const runtime = 'nodejs';

// POST /api/pegawai/today-summary/send-wa
// Builds a summary message of (1) pegawai tanpa task hari ini and (2) pegawai dengan overdue tasks,
// then sends it to all SUPER_ADMIN numbers via wa.expressa.id
export async function POST(_req: NextRequest) {
  try {
    const result = await sendTodaySummary();
    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/pegawai/today-summary/send-wa error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

