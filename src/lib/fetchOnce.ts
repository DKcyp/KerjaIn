// Simple in-memory fetch deduplication helper for client components (dev-friendly)
// Dedupes by URL+method for a short TTL window and shares in-flight promise.

export type FetchOnceOptions = RequestInit & { ttlMs?: number };

type Key = string; // `${method}|${url}`
const inFlight = new Map<Key, Promise<Response>>();
const lastOkAt = new Map<Key, number>();

function keyOf(url: string, init?: RequestInit): Key {
  const method = (init?.method || 'GET').toUpperCase();
  return `${method}|${url}`;
}

export async function fetchOnce(url: string, init?: FetchOnceOptions): Promise<Response> {
  const ttl = init?.ttlMs ?? 3000; // default 3s window
  const k = keyOf(url, init);

  const now = Date.now();
  const last = lastOkAt.get(k) || 0;
  if (now - last < ttl) {
    // recently fetched successfully; let browser cache/revalidation handle it
    return fetch(url, init);
  }

  if (inFlight.has(k)) {
    // Clone the response so each caller gets their own readable body stream.
    // Without cloning, the second caller would get a "body already used" error
    // when trying to call .json() after the first caller already consumed it.
    const shared = await inFlight.get(k)!;
    return shared.clone();
  }

  const p = fetch(url, init).then((res) => {
    if (res.ok) lastOkAt.set(k, Date.now());
    return res;
  }).finally(() => {
    // release in-flight immediately after resolution
    inFlight.delete(k);
  });
  inFlight.set(k, p);
  return p;
}

export async function fetchOnceJson<T = any>(url: string, init?: FetchOnceOptions): Promise<T | null> {
  const res = await fetchOnce(url, init);
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}
