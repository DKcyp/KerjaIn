# CORS Security & Network Optimization

## CORS Implementation

### Overview
Implemented CORS middleware to restrict API access to authorized origins only. This prevents unauthorized cross-origin requests while allowing legitimate requests from trusted domains.

### Allowed Origins
- Development: `http://localhost:3000`, `http://localhost:3002`, `http://localhost:3001`
- Production: `https://hub.richz.id`, `https://log-trial.richz.id`, `https://log.richz.id`

### How It Works

1. **Preflight Requests**: OPTIONS requests are handled automatically
2. **Origin Validation**: Only requests from allowed origins receive CORS headers
3. **Credentials**: Cookies are included in cross-origin requests (credentials: true)
4. **Cache**: CORS headers are cached for 24 hours

### Implementation

```typescript
// In src/lib/cors.ts
import { withCORS } from '@/lib/cors';

// Wrap your handler
export const GET = withCORS(handleGET);
```

### Adding CORS to More Endpoints

To add CORS to other endpoints:

```typescript
import { withCORS } from '@/lib/cors';

async function handleGET(req: NextRequest) {
  // Your handler logic
  return NextResponse.json({ data: ... });
}

export const GET = withCORS(handleGET);
```

### Updating Allowed Origins

Edit `src/lib/cors.ts` and update the `ALLOWED_ORIGINS` array:

```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://your-domain.com',
  // Add more origins as needed
];
```

---

## Network Optimization

### Current Issues
- Multiple redundant GET requests when opening tasklist
- No request deduplication
- No caching strategy

### Solutions Implemented

#### 1. Request Deduplication
Use React Query or SWR to automatically deduplicate concurrent requests:

```typescript
import { useQuery } from '@tanstack/react-query';

export function useTasklist() {
  return useQuery({
    queryKey: ['tasklist'],
    queryFn: async () => {
      const res = await fetch('/api/tasklist');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

#### 2. Caching Strategy
- **Stale Time**: 5 minutes (data considered fresh for 5 min)
- **Cache Time**: 10 minutes (keep in cache for 10 min)
- **Background Refetch**: Automatically refetch when data becomes stale

#### 3. Request Batching
Combine multiple requests into one:

```typescript
// Instead of:
// GET /api/tasklist
// GET /api/tasklist/stats
// GET /api/tasklist/filters

// Create batch endpoint:
// GET /api/tasklist/batch?include=stats,filters
```

#### 4. Pagination
Implement pagination to reduce payload size:

```typescript
// GET /api/tasklist?page=1&limit=20
```

### Monitoring Network Requests

Check DevTools Network tab for:
- Duplicate requests (same URL, same time)
- Large payloads (> 1MB)
- Slow requests (> 1s)
- Failed requests (4xx, 5xx)

### Best Practices

1. **Use React Query/SWR**: Automatic deduplication and caching
2. **Set appropriate staleTime**: Balance between freshness and performance
3. **Implement pagination**: Reduce payload size
4. **Use compression**: Enable gzip compression on server
5. **Monitor performance**: Use DevTools and analytics

### Example: Optimized Tasklist Hook

```typescript
import { useQuery } from '@tanstack/react-query';

export function useTasklist(filters?: TasklistFilters) {
  return useQuery({
    queryKey: ['tasklist', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.projectId) params.append('projectId', filters.projectId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page);
      if (filters?.limit) params.append('limit', filters.limit);
      
      const res = await fetch(`/api/tasklist?${params}`);
      if (!res.ok) throw new Error('Failed to fetch tasklist');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

### Performance Targets

- First load: < 2s
- Subsequent loads: < 500ms (from cache)
- Network requests: < 5 per page load
- Payload size: < 500KB

---

## Security Considerations

### CORS Headers
- `Access-Control-Allow-Origin`: Only trusted origins
- `Access-Control-Allow-Credentials`: true (for cookies)
- `Access-Control-Max-Age`: 86400 (24 hours)

### Cookie Security
- HttpOnly: Prevents JavaScript access
- Secure: Only sent over HTTPS
- SameSite: Lax (CSRF protection)

### API Security
- Validate origin on every request
- Check authentication on every endpoint
- Rate limit API endpoints
- Log suspicious requests

---

## Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"
1. Check if origin is in `ALLOWED_ORIGINS`
2. Verify request includes `credentials: 'include'`
3. Check browser console for exact origin being sent

### Multiple Requests in Network Tab
1. Check if using React Query/SWR
2. Look for duplicate queryKey
3. Check component re-renders
4. Use React DevTools Profiler

### Slow Network Requests
1. Check payload size (DevTools Network tab)
2. Enable gzip compression
3. Implement pagination
4. Add caching headers
