/**
 * Simple in-memory request cache to prevent duplicate API calls
 * Useful for preventing multiple identical requests during component renders
 */

type CacheEntry<T> = {
  promise: Promise<T>;
  timestamp: number;
};

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with automatic deduplication
 * If the same URL is requested multiple times before the first request completes,
 * all requests will share the same promise
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl: number = CACHE_TTL
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options || {})}`;
  const now = Date.now();

  // Check if we have a valid cached entry
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < ttl) {
    return cached.promise;
  }

  // Create new request promise
  const promise = fetch(url, options)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<T>;
    });

  // Store in cache
  cache.set(cacheKey, { promise, timestamp: now });

  // Clean up old entries periodically
  if (cache.size > 100) {
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > ttl) {
        cache.delete(key);
      }
    }
  }

  return promise;
}

/**
 * Clear cache for a specific URL or all cache
 */
export function clearCache(url?: string): void {
  if (url) {
    for (const key of cache.keys()) {
      if (key.startsWith(url)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}
