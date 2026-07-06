import { NextRequest, NextResponse } from 'next/server';
import { sendTodaySummary } from '@/lib/todaySummary';

export const runtime = 'nodejs';

// GET /api/pegawai/today-summary/refresh
// Cek jendela waktu dan, jika diizinkan, jalankan pengiriman ringkasan WA
export async function GET(_req: NextRequest) {
  try {
    const now = new Date();
    // Hitung hari dan jam berdasarkan Asia/Jakarta
    const tz = 'Asia/Jakarta';
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(now);
    const weekdayStr = (parts.find(p => p.type === 'weekday')?.value || 'Sun') as 'Sun'|'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat';
    const hour = Number(parts.find(p => p.type === 'hour')?.value || '0');
    const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const day = weekdayMap[weekdayStr] ?? 0; // 0=Min, 1=Sen, ..., 6=Sab (berdasar Jakarta)

    let allowed = false;
    if (day >= 1 && day <= 5) {
      // Senin - Jumat: 08:00 - 15:59
      allowed = hour >= 8 && hour <= 15;
    } else if (day === 6) {
      // Sabtu: 09:00 - 11:59
      allowed = hour >= 9 && hour <= 11;
    }

    if (!allowed) {
      return NextResponse.json(
        {
          status: 'skipped',
          reason: 'Di luar jendela waktu yang diizinkan',
          now: now.toISOString(),
          jakartaNow: new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(now),
          day,
          hour,
          allowedWindows: {
            seninSampaiJumat: '08-15 (inklusif, Asia/Jakarta)',
            sabtu: '09-11 (inklusif, Asia/Jakarta)',
          },
        },
        { status: 200 }
      );
    }

    const result = await sendTodaySummary();
    return NextResponse.json({ status: 'sent', ...result });
  } catch (e) {
    console.error('GET /api/pegawai/today-summary/refresh error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST juga didukung untuk fleksibilitas
export const POST = GET;
