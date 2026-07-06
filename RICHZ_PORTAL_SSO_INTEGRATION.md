# Richz Portal SSO Integration Guide (Localhost Development)

## Overview

This guide explains how to integrate the Logbook application with the new Richz Portal SSO system using localhost for development (similar to richz-pages integration).

## Current vs New Architecture

### Current Setup (Old SSO)
- SSO Dashboard: `https://portal-dev.expressa.id`
- SSO API: `https://api-portal-dev.expressa.id`
- Uses JWT tokens with `/auth/login`, `/auth/verify`, `/auth/refresh` endpoints
- Token-based authentication with access/refresh tokens

### New Setup (Richz Portal)
- Portal: `http://localhost:3000` (local) or `https://portal.expressa.id` (production)
- Uses NextAuth session cookies
- Cookie-based authentication
- SSO endpoint: `/api/sso/me`

## How It Works

### Development (localhost)
- Portal: `http://localhost:3000`
- Logbook: `http://localhost:3002`
- Cookies NOT shared (different ports)
- Logbook verifies authentication with Portal SSO endpoint
- User clicks "Sign in with Portal" to authenticate

### Production (subdomains)
- Portal: `https://portal.expressa.id`
- Logbook: `https://log.expressa.id`
- Cookies shared via `.expressa.id` domain
- Automatic SSO (seamless authentication)

## Step-by-Step Implementation

### Step 1: Update Environment Variables

Update `logbook/.env`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/richz_log"

# Richz Portal SSO Configuration
PORTAL_URL="http://localhost:3000"
NEXT_PUBLIC_PORTAL_URL="http://localhost:3000"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3002"
NODE_ENV="development"
PORT="3002"

# SSO Settings
SSO_ENABLED="true"
SSO_BYPASS_FOR_DEV="false"

# Keep other existing configs...
EXTERNAL_API_KEY="172dc4710ab54af8b1b405c89d6de9f0"
```

### Step 2: Portal SSO Client Library

The library is already created at `logbook/src/lib/portal-sso.ts`. It provides:
- `verifyPortalSession()` - Verify user with Portal
- `mapPortalRole()` - Map Portal roles to Logbook roles
- `getPortalLoginUrl()` - Get Portal login URL
- `isPortalSSOEnabled()` - Check if SSO is enabled

### Step 3: Create Portal SSO API Route

Create `logbook/src/app/api/auth/portal-sso/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalSession, mapPortalRole } from '@/lib/portal-sso';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get return URL from query params
    const returnUrl = request.nextUrl.searchParams.get('return_url') || '/';

    // Verify Portal session
    const cookieHeader = request.headers.get('cookie');
    const portalResponse = await verifyPortalSession(cookieHeader);

    if (!portalResponse.authenticated || !portalResponse.user) {
      // Redirect to Portal login
      const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000';
      const loginUrl = new URL('/login', portalUrl);
      loginUrl.searchParams.set('callbackUrl', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/portal-sso?return_url=${encodeURIComponent(returnUrl)}`);
      
      return NextResponse.redirect(loginUrl);
    }

    const portalUser = portalResponse.user;

    // Find or create user in local database
    let user = await prisma.user.findUnique({
      where: { email: portalUser.email },
    });

    if (!user) {
      // Create new user from Portal data
      user = await prisma.user.create({
        data: {
          email: portalUser.email,
          namaLengkap: portalUser.displayName,
          username: portalUser.email.split('@')[0],
          password: '', // No password for SSO users
          role: mapPortalRole(portalUser.role),
        },
      });
    } else {
      // Update user info from Portal
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          namaLengkap: portalUser.displayName,
          role: mapPortalRole(portalUser.role),
        },
      });
    }

    // Create local session
    const sessionData = {
      id: user.id,
      role: user.role,
      namaLengkap: user.namaLengkap,
      username: user.username,
      email: user.email,
      ssoEnabled: true,
      portalUserId: portalUser.id,
    };

    const response = NextResponse.redirect(new URL(returnUrl, request.url));

    // Set local session cookie
    response.cookies.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Portal SSO] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 4: Update Sign In Page

Update your sign-in page to add Portal SSO button. Find the signin page (likely at `logbook/src/app/auth/signin/page.tsx` or similar) and add:

```typescript
<button
  type="button"
  onClick={() => {
    const currentUrl = window.location.href;
    window.location.href = `/api/auth/portal-sso?return_url=${encodeURIComponent('/')}`;
  }}
  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
>
  Sign in with Richz Portal
</button>
```

### Step 5: Update Portal App List

Already done! The Portal now includes Logbook at `http://localhost:3002`.

## Testing the Integration

### 1. Start Both Applications

Terminal 1 - Portal:
```bash
cd richz-portal
npm run dev
```

Terminal 2 - Logbook:
```bash
cd logbook
npm run dev -- --port=3002
```

### 2. Test SSO Flow

**Option A: Direct SSO Login**
1. Go to `http://localhost:3002/signin`
2. Click "Sign in with Richz Portal"
3. Redirects to Portal login (if not logged in)
4. After login, redirects back to Logbook
5. You're logged in!

**Option B: Via Portal Dashboard**
1. Go to `http://localhost:3000/login`
2. Login with `admin@richz.com` / `admin`
3. Click "Richz Logbook" in dashboard
4. Opens `http://localhost:3002`
5. Click "Sign in with Richz Portal" to authenticate

### 3. Verify Authentication

- Check that you can access protected routes
- Verify user data is synced from Portal
- Test logout functionality

## Production Deployment

For production with subdomain cookie sharing:

**Portal (.env):**
```bash
NEXTAUTH_URL=https://portal.expressa.id
COOKIE_DOMAIN=.expressa.id
```

**Logbook (.env):**
```bash
PORTAL_URL=https://portal.expressa.id
NEXT_PUBLIC_APP_URL=https://log.expressa.id
COOKIE_DOMAIN=.expressa.id
```

**DNS:**
- `portal.expressa.id` → Portal server
- `log.expressa.id` → Logbook server

In production, cookies are shared and SSO is seamless!

## Troubleshooting

### "Cannot connect to Portal"
- Verify Portal is running on port 3000
- Check `PORTAL_URL=http://localhost:3000` in logbook .env
- Ensure no firewall blocking localhost

### User Not Created
- Check database connection
- Verify Prisma schema has User model
- Check server logs for errors

### SSO Redirect Loop
- Clear browser cookies
- Check return_url parameter
- Verify Portal login is working

## API Endpoints

### Portal

**GET /api/sso/me**
- Verifies user session
- Returns user data for SSO
- Requires valid NextAuth session cookie

Response:
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "displayName": "John Doe",
    "role": "Super Admin",
    "tenant": {
      "id": "uuid",
      "name": "Expressa",
      "slug": "expressa"
    }
  }
}
```

### Logbook

**GET /api/auth/portal-sso**
- Verifies Portal session
- Creates/updates local user
- Sets local session cookie
- Redirects to return_url

## Next Steps

1. ✅ Environment configured
2. ✅ Portal SSO library created
3. ⬜ Implement Portal SSO API route
4. ⬜ Add SSO button to login page
5. ⬜ Test SSO flow
6. ⬜ Deploy to production
7. ⬜ Add audit logging

## Support

For issues or questions:
- Check the troubleshooting section above
- Review browser console and server logs
- Verify environment variables are set correctly
- Test with curl to isolate client vs server issues
