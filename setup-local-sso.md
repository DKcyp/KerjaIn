# Quick Setup Guide: Logbook + Richz Portal SSO (Localhost)

## Overview

This guide shows how to integrate Logbook with Richz Portal SSO using localhost (similar to richz-pages integration).

**Important:** On localhost, cookies are NOT shared between different ports. Each app maintains its own session, but Logbook can verify authentication with the Portal SSO endpoint.

## Step 1: Configure Logbook Environment

Copy the Portal SSO configuration:
```bash
cd logbook
copy .env.portal-sso .env
```

Or manually update your `.env` file with these key settings:
```bash
PORTAL_URL="http://localhost:3000"
NEXT_PUBLIC_PORTAL_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3002"
SSO_ENABLED="true"
SSO_BYPASS_FOR_DEV="false"
PORT="3002"
```

## Step 2: Configure Portal Environment

Update `richz-portal/.env`:
```bash
NEXTAUTH_URL="http://localhost:3000"
# No COOKIE_DOMAIN needed for localhost
```

## Step 3: Start Both Applications

Terminal 1 - Portal:
```bash
cd richz-portal
npm run dev
```
Portal will be at: `http://localhost:3000`

Terminal 2 - Logbook:
```bash
cd logbook
npm run dev -- --port=3002
```
Logbook will be at: `http://localhost:3002`

## Step 4: Test SSO Flow

### Option A: Direct SSO Login (Recommended for Development)

1. Open browser: `http://localhost:3002/signin`
2. Click "Sign in with Richz Portal" button
3. Will redirect to Portal login if not logged in
4. After Portal login, redirects back to Logbook
5. You're logged into Logbook!

### Option B: Via Portal Dashboard

1. Open browser: `http://localhost:3000/login`
2. Login with: `admin@richz.com` / `admin`
3. You should see the dashboard with apps
4. Click "Richz Logbook" app
5. Opens `http://localhost:3002` in new tab
6. Click "Sign in with Richz Portal" to authenticate

**Note:** Unlike production with subdomains, localhost requires explicit SSO login because cookies aren't shared between ports.

## How It Works on Localhost

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  localhost:3000 cookies (Portal)                       │ │
│  │  localhost:3002 cookies (Logbook)                      │ │
│  │  ✗ NOT shared (different ports)                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         │ 1. Login                           │ 3. Verify SSO
         ▼                                    ▼
┌──────────────────────┐           ┌──────────────────────┐
│  localhost:3000      │           │  localhost:3002      │
│  (Portal)            │           │  (Logbook)           │
│                      │           │                      │
│  • NextAuth          │◄──────────│  • User clicks       │
│  • Creates session   │ 2. Check  │    "Sign in with     │
│  • Returns user data │   SSO     │    Portal"           │
│                      │           │  • Calls /api/sso/me │
└──────────────────────┘           └──────────────────────┘
```

## Troubleshooting

### Port Already in Use
```powershell
# Find process using port 3002
netstat -ano | findstr :3002

# Kill process (replace <PID> with actual PID)
taskkill /PID <PID> /F
```

### SSO Not Working
- Check portal is running on port 3000
- Check logbook is running on port 3002
- Verify `PORTAL_URL=http://localhost:3000` in logbook .env
- Check browser console for errors
- Check server logs for SSO verification attempts

### "Cannot connect to Portal"
- Ensure Portal is running: `http://localhost:3000`
- Check no firewall blocking localhost connections
- Verify PORTAL_URL doesn't have trailing slash

## What's Next?

Once basic setup is working:

1. **Implement the Portal SSO API route** in logbook to handle user sync
2. **Update the middleware** to check Portal session (optional for localhost)
3. **Add "Sign in with Portal" button** to the login page
4. **Test logout flow**
5. **Deploy to production** with real domains (cookies WILL be shared there!)

See `RICHZ_PORTAL_SSO_INTEGRATION.md` for detailed implementation steps!

## Development vs Production

### Development (localhost)
- Portal: `http://localhost:3000`
- Logbook: `http://localhost:3002`
- Cookies: NOT shared (different ports)
- Auth: Explicit SSO login required
- Use: Local development and testing

### Production (subdomains)
- Portal: `https://portal.expressa.id`
- Logbook: `https://log.expressa.id`
- Cookies: Shared (same domain `.expressa.id`)
- Auth: Automatic SSO (seamless)
- Use: Production deployment

**The same code works in both environments!** The only difference is cookie sharing behavior.

## Production Deployment

For production with subdomain cookie sharing:

**Portal:**
```bash
NEXTAUTH_URL=https://portal.expressa.id
COOKIE_DOMAIN=.expressa.id
```

**Logbook:**
```bash
PORTAL_URL=https://portal.expressa.id
NEXT_PUBLIC_APP_URL=https://log.expressa.id
COOKIE_DOMAIN=.expressa.id
```

**DNS Configuration:**
- `portal.expressa.id` → Portal server
- `log.expressa.id` → Logbook server

In production, cookies are shared and SSO is seamless!
