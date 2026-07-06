// Shared PR cache for GitHub pull requests
const CACHE_TTL = 10 * 1000; // 10 seconds - Short TTL to ensure fresh data

const prCache = new Map<string, {
  data: any[];
  timestamp: number;
}>();

export function getPRCache(repo: string, state: string = "open") {
  const cacheKey = `${repo}:${state}`;
  const cached = prCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[PR Cache] Cache hit for ${cacheKey}`);
    return cached.data;
  }
  
  console.log(`[PR Cache] Cache miss for ${cacheKey}`);
  return null;
}

export function setPRCache(repo: string, state: string = "open", data: any[]) {
  const cacheKey = `${repo}:${state}`;
  prCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  console.log(`[PR Cache] Cache set for ${cacheKey}`);
}

export function invalidatePRCache(repo: string, state?: string) {
  if (state) {
    const cacheKey = `${repo}:${state}`;
    prCache.delete(cacheKey);
    console.log(`[PR Cache] Cache invalidated for ${cacheKey}`);
  } else {
    // Invalidate all states for this repo
    const keysToDelete: string[] = [];
    prCache.forEach((_, key) => {
      if (key.startsWith(`${repo}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => prCache.delete(key));
    console.log(`[PR Cache] Cache invalidated for all states of ${repo}`);
  }
}
