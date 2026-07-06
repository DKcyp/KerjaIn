# SSO Server Actions Error Fix

This document explains the fix for the "Invalid Server Actions request" error that occurs during SSO authentication.

## Problem

**Error**: `Error: Invalid Server Actions request`
**Root Cause**: Next.js Server Actions security validation fails when the `host` header doesn't match the `origin` header.

**Specific Issue**:
```
host header with value `192.168.1.15:3000` does not match `origin` header with value `192.168.1.6:3000`
```

This happens because:
1. SSO server (`192.168.1.6:3000`) redirects to app server (`192.168.1.15:3000`)
2. Next.js detects cross-origin request and blocks it for security
3. Server Actions fail with 500 error

## Solution

### 1. Next.js Configuration (`next.config.ts`)

Added Server Actions allowed origins:
```typescript
experimental: {
  serverActions: {
    allowedOrigins: [
      'localhost:3000',
      '192.168.1.15:3000', // App server
      '192.168.1.6:3000',  // SSO server
      '127.0.0.1:3000',
    ]
  }
}
```

Added CORS headers for auth routes:
```typescript
{
  source: "/api/auth/(.*)",
  headers: [
    { key: "Access-Control-Allow-Origin", value: "http://192.168.1.6:3000" },
    { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
    { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
    { key: "Access-Control-Allow-Credentials", value: "true" },
  ],
}
```

### 2. SSO Callback Route Enhancement

Added POST method support:
```typescript
export async function POST(req: NextRequest) {
  // Handle POST parameters from body or URL
  // Delegate to GET handler for consistent processing
}
```

Added OPTIONS method for CORS preflight:
```typescript
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://192.168.1.6:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      // ... other CORS headers
    },
  });
}
```

### 3. Middleware Enhancement (`middleware.ts`)

Added CORS handling for auth routes:
```typescript
// Handle CORS for SSO callback routes
if (pathname.startsWith('/api/auth/')) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://192.168.1.6:3000',  // SSO server
    'http://192.168.1.15:3000', // App server
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { /* CORS headers */ });
  }

  // Add CORS headers to actual requests
  const response = NextResponse.next();
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}
```

## Files Modified

1. **`next.config.ts`**
   - Added `experimental.serverActions.allowedOrigins`
   - Added CORS headers for `/api/auth/*` routes

2. **`src/app/api/auth/sso-callback/route.ts`**
   - Added POST method handler
   - Added OPTIONS method for CORS preflight
   - Enhanced parameter handling for both GET and POST

3. **`src/middleware.ts`**
   - Added CORS handling for auth routes
   - Dynamic origin validation
   - Preflight request handling

## How It Works

### Before Fix
```
SSO Server (192.168.1.6:3000)
         ↓ POST/redirect
App Server (192.168.1.15:3000)
         ↓ 
Next.js detects cross-origin
         ↓
❌ "Invalid Server Actions request"
```

### After Fix
```
SSO Server (192.168.1.6:3000)
         ↓ POST/redirect
Middleware validates origin
         ↓ ✅ Allowed
App Server processes request
         ↓ ✅ Success
User authenticated & redirected
```

## Testing

### 1. Restart Development Server
```bash
npm run dev
```

### 2. Test SSO Flow
1. Visit `/auth/signin`
2. SSO popup should open
3. Complete authentication
4. Popup should close automatically
5. User should be redirected to dashboard

### 3. Check Console
Should see successful requests instead of 500 errors:
```
✅ GET /api/auth/sso-callback 200
✅ POST /api/auth/sso-callback 200
```

## Security Considerations

### Origin Validation
- Only specific origins are allowed
- Dynamic validation based on request origin
- Credentials are allowed for trusted origins

### CORS Configuration
- Restrictive CORS policy
- Only necessary headers allowed
- Credentials only for authenticated requests

### Server Actions Security
- Maintains Next.js security while allowing SSO
- Origin whitelist prevents unauthorized access
- No impact on other application security

## Troubleshooting

### Still Getting 500 Errors?
1. **Check Environment Variables**: Ensure SSO URLs are correct
2. **Restart Server**: Configuration changes require restart
3. **Check Network**: Verify connectivity between servers
4. **Browser Cache**: Clear browser cache and cookies

### CORS Issues?
1. **Check Origin Header**: Verify request origin matches allowed list
2. **Preflight Requests**: Ensure OPTIONS requests return 200
3. **Credentials**: Check if cookies are being sent properly

### Server Actions Still Failing?
1. **Check allowedOrigins**: Verify all necessary origins are listed
2. **Host Header**: Check if host header matches expected value
3. **Next.js Version**: Ensure compatible Next.js version

## Production Deployment

### Environment-Specific Configuration
Update origins for production:
```typescript
allowedOrigins: [
  process.env.NODE_ENV === 'production' 
    ? 'https://sso.company.com'
    : 'http://192.168.1.6:3000',
  process.env.NODE_ENV === 'production'
    ? 'https://logbook.company.com' 
    : 'http://192.168.1.15:3000',
]
```

### HTTPS Considerations
- Use HTTPS in production
- Update CORS origins to use `https://`
- Ensure SSL certificates are valid

### Load Balancer Configuration
If using load balancers:
- Configure proper host header forwarding
- Ensure origin headers are preserved
- Update allowed origins to include load balancer IPs

## Summary

The fix resolves the Server Actions error by:
1. **Allowing Cross-Origin Server Actions** from SSO server
2. **Adding CORS Support** for auth endpoints
3. **Enhancing Request Handling** for both GET and POST
4. **Maintaining Security** through origin validation

This enables seamless SSO authentication while maintaining Next.js security features.
