# SSO Development Bypass

This document explains how to bypass SSO authentication for development purposes.

## Overview

The SSO bypass feature allows developers to use regular username/password authentication instead of SSO during development. This is useful when:

- SSO server is not available
- Testing local authentication flows
- Development environment setup
- Debugging authentication issues

## Configuration

### Environment Variables

Add the following environment variable to your `.env.development` file:

```bash
# Set to "true" to bypass SSO for development (allows local login without SSO validation)
SSO_BYPASS_FOR_DEV="true"
```

### How It Works

When `SSO_BYPASS_FOR_DEV="true"` is set:

1. **Regular Login Enabled**: The `/api/auth/login` endpoint allows username/password authentication
2. **SSO Validation Skipped**: The `/api/auth/me` endpoint skips SSO token validation
3. **Local Sessions**: Users can authenticate using local database credentials

When `SSO_BYPASS_FOR_DEV="false"` or not set:

1. **SSO Required**: Regular login is blocked, only SSO authentication is allowed
2. **Token Validation**: SSO tokens are validated on each request
3. **SSO Sessions**: Users must authenticate through SSO server

## Usage

### Enable SSO Bypass

1. Edit your `.env.development` file:
   ```bash
   SSO_BYPASS_FOR_DEV="true"
   ```

2. Restart your development server:
   ```bash
   npm run dev
   ```

3. You can now use regular login with username/password

### Disable SSO Bypass

1. Edit your `.env.development` file:
   ```bash
   SSO_BYPASS_FOR_DEV="false"
   # or remove the line entirely
   ```

2. Restart your development server
3. SSO authentication will be required

## Security Notes

⚠️ **Important Security Considerations:**

- **Development Only**: This bypass should NEVER be enabled in production
- **Environment Specific**: Only use in `.env.development`, never in production environment files
- **Local Testing**: Only enable when testing locally or in isolated development environments

## Logging

When SSO bypass is enabled, you'll see console logs indicating the bypass is active:

```
[SSO] SSO bypass enabled - allowing regular login for development
[SSO] SSO bypass enabled for development - skipping SSO validation for user 123
```

## Troubleshooting

### Regular Login Still Blocked

- Check that `SSO_BYPASS_FOR_DEV="true"` is set in your environment file
- Restart your development server after changing environment variables
- Verify the environment file is being loaded correctly

### SSO Still Required

- Ensure you're using the correct environment file (`.env.development` for dev mode)
- Check that there are no conflicting environment variables
- Verify the application is running in development mode

## Production Deployment

Before deploying to production:

1. Ensure `SSO_BYPASS_FOR_DEV` is not set in production environment
2. Verify SSO configuration is correct for production
3. Test SSO authentication in staging environment first

## Related Files

- `src/lib/sso.ts` - SSO utility functions
- `src/app/api/auth/login/route.ts` - Regular login endpoint
- `src/app/api/auth/me/route.ts` - User session validation
- `.env.development` - Development environment configuration
