# SSO Integration Troubleshooting Guide

## Current Status
✅ SSO integration has been implemented
✅ Database schema updated with SSO fields
✅ Prisma client regenerated
✅ API routes created for SSO authentication

## Common Issues and Solutions

### 1. Tasklist/Dashboard Not Loading

**Symptoms:**
- Pages show loading indefinitely
- Database queries fail
- "Cannot read properties" errors

**Solutions:**
1. **Restart Development Server**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Clear Next.js Cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Verify Database Connection**
   - Visit: `http://localhost:3000/api/test-db`
   - Should return database statistics and SSO field availability

### 2. Prisma Client Issues

**Symptoms:**
- "PrismaClient is not configured" errors
- Missing SSO fields in queries
- EPERM errors during generation

**Solutions:**
1. **Manual Prisma Client Regeneration**
   ```bash
   # Stop dev server first
   npx prisma generate --no-engine
   # Restart dev server
   ```

2. **Use Fix Script**
   ```bash
   node scripts/fix-prisma.js
   ```

3. **Manual Database Push**
   ```bash
   $env:DATABASE_URL="postgresql://its:itsthok@103.157.97.200:5432/pmis?schema=public"
   npx prisma db push
   ```

### 3. SSO Authentication Issues

**Symptoms:**
- SSO login fails
- "Failed to connect to SSO server" error
- Fallback to local auth not working

**Solutions:**
1. **Check SSO Server**
   - Ensure SSO server is running on `localhost:4000`
   - Test with: `curl http://localhost:4000/health`

2. **Check Environment Variables**
   ```bash
   # In .env.development
   SSO_BASE_URL="http://localhost:4000"
   SSO_ENABLED="true"
   ```

3. **Test SSO Endpoints**
   - Login: `POST /api/auth/sso-login`
   - Refresh: `POST /api/auth/sso-refresh`
   - Logout: `POST /api/auth/sso-logout`

### 4. Database Schema Issues

**Symptoms:**
- "Column does not exist" errors
- SSO fields not found
- Migration failures

**Solutions:**
1. **Manual SQL Migration**
   ```sql
   -- Connect to PostgreSQL and run:
   ALTER TABLE pegawai 
   ADD COLUMN IF NOT EXISTS "ssoAccessToken" TEXT,
   ADD COLUMN IF NOT EXISTS "ssoRefreshToken" TEXT,
   ADD COLUMN IF NOT EXISTS "ssoTokenExpiry" TIMESTAMP(3),
   ADD COLUMN IF NOT EXISTS "ssoUserId" TEXT,
   ADD COLUMN IF NOT EXISTS "ssoRoleId" TEXT,
   ADD COLUMN IF NOT EXISTS "ssoCompanyId" TEXT;
   ```

2. **Verify Schema**
   ```sql
   -- Check if columns exist
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'pegawai' AND column_name LIKE 'sso%';
   ```

## Testing Checklist

### ✅ Basic Functionality
- [ ] Dashboard loads without errors
- [ ] Tasklist page accessible
- [ ] User authentication works
- [ ] Database queries execute successfully

### ✅ SSO Integration
- [ ] SSO login form shows OTP field toggle
- [ ] SSO server connection works
- [ ] Local auth fallback functions
- [ ] Token refresh works automatically
- [ ] SSO logout clears all tokens

### ✅ Database Integration
- [ ] SSO fields exist in pegawai table
- [ ] New users created with SSO data
- [ ] Existing users updated with SSO tokens
- [ ] Prisma client includes SSO fields

## Debug Commands

### Check Database Connection
```bash
# Test basic connectivity
curl http://localhost:3000/api/test-db
```

### Check Authentication
```bash
# Test current user session
curl http://localhost:3000/api/auth/me
```

### Check SSO Server
```bash
# Test SSO server health
curl http://localhost:4000/health
```

### View Application Logs
```bash
# In development server console
# Look for:
# - Database connection errors
# - Prisma client errors
# - SSO authentication errors
# - Token refresh errors
```

## Recovery Steps

If everything is broken:

1. **Stop Development Server**
   ```bash
   Ctrl+C
   ```

2. **Clean Everything**
   ```bash
   rm -rf .next
   rm -rf node_modules/.prisma
   ```

3. **Regenerate Prisma Client**
   ```bash
   $env:DATABASE_URL="postgresql://its:itsthok@103.157.97.200:5432/pmis?schema=public"
   npx prisma generate --no-engine
   ```

4. **Restart Server**
   ```bash
   npm run dev
   ```

5. **Test Basic Functionality**
   - Visit dashboard: `http://localhost:3000`
   - Check database: `http://localhost:3000/api/test-db`
   - Test login: `http://localhost:3000/signin`

## Contact Information

If issues persist:
1. Check server console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure SSO server is running and accessible
4. Check database connectivity and schema

## Recent Changes Made

1. ✅ Added SSO fields to Prisma schema
2. ✅ Created SSO service layer (`src/lib/sso.ts`)
3. ✅ Implemented SSO API routes
4. ✅ Updated login form with OTP support
5. ✅ Enhanced AuthContext with SSO methods
6. ✅ Added graceful error handling for missing SSO fields
7. ✅ Created database migration scripts
8. ✅ Regenerated Prisma client with SSO fields
