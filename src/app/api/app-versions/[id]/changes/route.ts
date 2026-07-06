import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  context: any
) {
  const id = context?.params?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ status: 'success', items: [], error: 'Missing version id' }, { status: 200 });
  }

  const url = `https://api-serverhub.expressa.id/app-versions/${id}/changes`;
  const maxAttempts = 3;
  let lastErr: string | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 200 });
      } else {
        const text = await res.text().catch(() => '');
        lastErr = `Upstream ${res.status} ${res.statusText} ${text?.slice(0, 200)}`;
      }
    } catch (e: any) {
      clearTimeout(timeout);
      lastErr = `${e?.name || 'Error'} ${e?.message || 'Unknown error'}`;
    }
    const backoff = attempt * attempt * 200;
    await new Promise((r) => setTimeout(r, backoff));
  }
  return NextResponse.json({ status: 'success', items: [], error: lastErr || 'fetch failed' }, { status: 200 });
}
