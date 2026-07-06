# SSO Integration Setup Guide

## Overview
This guide explains how to set up and test the SSO (Single Sign-On) integration with your logbook application.

## Prerequisites
- SSO server running on `localhost:4000`
- PostgreSQL database access
- Node.js and npm installed

## Setup Steps

### 1. Database Migration
Run the SQL migration to add SSO fields to your database:

```sql
-- Connect to your PostgreSQL database and run:
-- File: scripts/add-sso-migration.sql

ALTER TABLE pegawai 
ADD COLUMN IF NOT EXISTS "ssoAccessToken" TEXT,
ADD COLUMN IF NOT EXISTS "ssoRefreshToken" TEXT,
ADD COLUMN IF NOT EXISTS "ssoTokenExpiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "ssoUserId" TEXT,
ADD COLUMN IF NOT EXISTS "ssoRoleId" TEXT,
ADD COLUMN IF NOT EXISTS "ssoCompanyId" TEXT;
```

### 2. Environment Configuration
The following environment variables have been added to `.env.development`:

```env
SSO_BASE_URL="http://localhost:4000"
SSO_ENABLED="true"
```

### 3. Prisma Client Generation
Generate the Prisma client to include the new SSO fields:

```bash
npx prisma generate
```

If you encounter permission errors, try:
```bash
# Stop the development server first
# Then run:
npx prisma generate
```

## How It Works

### Authentication Flow
1. **User enters credentials** in the login form
2. **SSO Login Attempt**: App tries to authenticate with SSO server first
3. **Local Fallback**: If SSO fails, falls back to local authentication
4. **User Creation**: New users from SSO are automatically created locally with default PROGRAMMER role
5. **Role Preservation**: Existing users keep their local project roles (not overridden by SSO)
6. **Token Management**: SSO tokens are stored securely and auto-refreshed

### API Endpoints

#### SSO Login
```
POST /api/auth/sso-login
Content-Type: application/json

{
  "username": "super",
  "password": "password123",
  "otp": "123456"  // Optional
}
```

#### SSO Logout
```
POST /api/auth/sso-logout
```

#### Token Refresh
```
POST /api/auth/sso-refresh
```

### Frontend Features
- **OTP Support**: Optional OTP field in login form (toggle to show/hide)
- **Hybrid Authentication**: Tries SSO first, falls back to local auth
- **SSO Status**: User object includes `ssoEnabled` and `ssoTokenValid` flags

## Testing

### 1. Start SSO Server
Ensure your SSO server is running on `localhost:4000`

### 2. Test SSO Login
1. Go to the login page
2. Enter SSO credentials (username: "super", password from SSO server)
3. Optionally click "Show OTP" and enter OTP if required
4. Click "Sign in"

### 3. Expected Behavior
- **Success**: User is logged in and redirected to dashboard
- **New User**: Automatically created in local database with SSO data
- **Existing User**: SSO tokens updated, user data synced
- **Fallback**: If SSO fails, tries local authentication

### 4. Verify SSO Integration
Check the user object in browser dev tools:
```javascript
// Should include SSO status
{
  id: 1,
  username: "super",
  role: "SUPER_ADMIN",
  ssoEnabled: true,
  ssoTokenValid: true
}
```

## Troubleshooting

### Common Issues

#### 1. SSO Server Connection Failed
- **Error**: "Failed to connect to SSO server"
- **Solution**: Ensure SSO server is running on `localhost:4000`

#### 2. Database Migration Issues
- **Error**: Column already exists
- **Solution**: Use `ADD COLUMN IF NOT EXISTS` in migration script

#### 3. Prisma Generate Permission Error
- **Error**: EPERM operation not permitted
- **Solution**: Stop dev server, run `npx prisma generate`, restart server

#### 4. Token Refresh Failed
- **Error**: Auto token refresh failed
- **Solution**: Check SSO server logs, verify refresh token endpoint

### Debug Mode
Enable debug logging by adding to `.env.development`:
```env
NODE_ENV=development
DEBUG=sso:*
```

## Security Notes

### Production Considerations
1. **HTTPS**: Use HTTPS in production for secure token transmission
2. **Token Encryption**: Consider encrypting SSO tokens in database
3. **CORS**: Configure CORS properly if SSO server is on different domain
4. **Rate Limiting**: Implement rate limiting on auth endpoints
5. **Audit Logging**: Log authentication attempts and token refreshes

### Token Management
- Access tokens expire in 1 hour (3600 seconds)
- Tokens are auto-refreshed 5 minutes before expiry
- Refresh tokens are used to get new access tokens
- All tokens are cleared on logout

## File Structure

```
src/
├── lib/
│   └── sso.ts                    # SSO service functions
├── types/
│   └── sso.ts                    # SSO type definitions
├── app/api/auth/
│   ├── sso-login/route.ts        # SSO login endpoint
│   ├── sso-refresh/route.ts      # Token refresh endpoint
│   ├── sso-logout/route.ts       # SSO logout endpoint
│   └── me/route.ts               # Updated with SSO support
├── components/auth/
│   └── SignInForm.tsx            # Updated with OTP field
└── context/
    └── AuthContext.tsx           # Updated with SSO methods
```

## Support

If you encounter issues:
1. Check SSO server logs
2. Check browser network tab for API errors
3. Check application logs for detailed error messages
4. Verify database schema includes new SSO columns
