import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(request: Request) {
  console.log('VERSION API called');
  try {
    const id = process.env.ID_APP_VERSION || process.env.NEXT_PUBLIC_ID_APP_VERSION;
    console.log('VERSION ID:', id);
    if (!id) {
      console.warn('VERSION Missing ID_APP_VERSION env');
      return NextResponse.json({ status: 'success', items: [], error: 'Missing ID_APP_VERSION env' }, { status: 200 });
    }

    const url = `https://api-serverhub.expressa.id/apps/${id}/versions`;
    const maxAttempts = 3;
    let lastErr: string | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        console.log('VERSION FETCH', res.url, res.status, `attempt ${attempt}`);
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: 200 });
        } else {
          const text = await res.text().catch(() => '');
          lastErr = `Upstream ${res.status} ${res.statusText} ${text?.slice(0, 200)}`;
          console.warn('VERSION FETCH ERROR', lastErr);
        }
      } catch (e: any) {
        clearTimeout(timeout);
        lastErr = `${e?.name || 'Error'} ${e?.message || 'Unknown error'}`;
        console.warn('VERSION FETCH EXCEPTION', lastErr, `attempt ${attempt}`);
      }
      // backoff: 200ms, 600ms
      const backoff = attempt * attempt * 200;
      await new Promise((r) => setTimeout(r, backoff));
    }
    return NextResponse.json({ status: 'success', items: [], error: lastErr || 'fetch failed' }, { status: 200 });
  } catch (e: any) {
    console.error('VERSION FETCH EXCEPTION', e?.name, e?.message);
    return NextResponse.json({ status: 'success', items: [], error: e?.message || 'Unknown error' }, { status: 200 });
  }
}
