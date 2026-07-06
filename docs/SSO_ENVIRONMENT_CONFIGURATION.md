# SSO Environment Configuration Guide

This document explains the new SSO environment configuration that separates SSO Dashboard and SSO API endpoints.

## Overview

The SSO system now uses separate environment variables for different purposes:

- **SSO Dashboard URLs**: Used for login redirections and user-facing SSO pages
- **SSO API URLs**: Used for API calls like `/me`, token refresh, logout, etc.

This separation allows for flexible deployment scenarios where the SSO dashboard and API might be hosted on different servers or ports.

## Environment Variables

### Required Variables

#### SSO Dashboard Configuration
```env
# Server-side SSO Dashboard URL
SSO_DASHBOARD_URL=http://192.168.1.6:3000

# Client-side SSO Dashboard URL (must be accessible from browser)
NEXT_PUBLIC_SSO_DASHBOARD_URL=http://192.168.1.6:3000
```

#### SSO API Configuration
```env
# Server-side SSO API URL
SSO_API_URL=http://192.168.1.6:3000

# Client-side SSO API URL (must be accessible from browser)
NEXT_PUBLIC_SSO_API_URL=http://192.168.1.6:3000
```

#### General SSO Configuration
```env
# Enable/disable SSO authentication
SSO_ENABLED=true

# SSO callback URL (where SSO server redirects after authentication)
SSO_CALLBACK_URL=http://192.168.1.15:3000/api/auth/sso-callback
NEXT_PUBLIC_SSO_CALLBACK_URL=http://192.168.1.15:3000/api/auth/sso-callback

# Application base URL
NEXT_PUBLIC_APP_URL=http://192.168.1.15:3000
```

### Legacy Support (Optional)
```env
# Legacy variables for backward compatibility
SSO_BASE_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_BASE_URL=http://192.168.1.6:3000
```

## Usage Patterns

### SSO Dashboard URLs
Used for:
- Login page redirections (`/login`)
- User-facing SSO authentication flows
- Popup window authentication

**Files that use Dashboard URLs:**
- `src/lib/ssoPopupService.ts`
- `src/components/auth/SignInForm.tsx`
- `src/lib/ssoConfig.ts` (getSSOLoginUrl)

### SSO API URLs
Used for:
- Token validation (`/auth/me`)
- Token refresh (`/auth/refresh`)
- User logout (`/auth/logout`)
- Session checks (`/auth/check`)

**Files that use API URLs:**
- `src/lib/sso.ts`
- `src/lib/ssoConfig.ts` (getSSOApiUrl functions)
- `src/app/api/auth/sso-logout/route.ts`
- `src/app/api/auth/sso-test/route.ts`

## Configuration Scenarios

### Scenario 1: Same Server (Development)
Both dashboard and API on the same server:
```env
SSO_DASHBOARD_URL=http://192.168.1.6:3000
SSO_API_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_DASHBOARD_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_API_URL=http://192.168.1.6:3000
```

### Scenario 2: Separate Servers (Production)
Dashboard and API on different servers:
```env
SSO_DASHBOARD_URL=https://sso-dashboard.company.com
SSO_API_URL=https://sso-api.company.com
NEXT_PUBLIC_SSO_DASHBOARD_URL=https://sso-dashboard.company.com
NEXT_PUBLIC_SSO_API_URL=https://sso-api.company.com
```

### Scenario 3: Different Ports
Same server, different ports:
```env
SSO_DASHBOARD_URL=http://192.168.1.6:3000
SSO_API_URL=http://192.168.1.6:4000
NEXT_PUBLIC_SSO_DASHBOARD_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_API_URL=http://192.168.1.6:4000
```

## Validation

The system includes built-in validation for SSO configuration:

```typescript
import { validateSSOConfig, getClientSSOConfig } from '@/lib/ssoConfig';

const config = getClientSSOConfig();
const validation = validateSSOConfig(config);

if (!validation.valid) {
  console.error('SSO Configuration errors:', validation.errors);
}
```

## Migration from Legacy Configuration

### Old Configuration (Deprecated)
```env
SSO_BASE_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_BASE_URL=http://192.168.1.6:3000
```

### New Configuration
```env
SSO_DASHBOARD_URL=http://192.168.1.6:3000
SSO_API_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_DASHBOARD_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_API_URL=http://192.168.1.6:3000
```

### Fallback Behavior
The system maintains backward compatibility:
- If new variables are not set, falls back to legacy `SSO_BASE_URL`
- If legacy variables are also not set, uses hardcoded defaults (development only)

## Troubleshooting

### Common Issues

1. **Mixed HTTP/HTTPS**
   - Ensure all URLs use the same protocol
   - HTTPS recommended for production

2. **CORS Issues**
   - Verify SSO server allows requests from your domain
   - Check that API URLs are accessible from browser

3. **Network Connectivity**
   - Test connectivity to both dashboard and API URLs
   - Verify firewall rules allow access

4. **Environment Variable Loading**
   - Restart application after changing environment variables
   - Verify variables are loaded correctly using debug endpoints

### Debug Commands

Check SSO configuration:
```bash
# Test SSO connectivity
curl -X GET "http://localhost:3000/api/auth/sso-test"

# Check environment variables
node -e "console.log(process.env.SSO_DASHBOARD_URL, process.env.SSO_API_URL)"
```

### Debug Endpoints

The system provides debug endpoints for troubleshooting:

- `GET /api/auth/sso-test` - Test SSO server connectivity
- `POST /api/auth/sso-test` - Test SSO login with credentials

## Security Considerations

### Environment Variable Security
- Never commit environment files to version control
- Use different values for development/staging/production
- Rotate API keys and URLs regularly

### Network Security
- Use HTTPS in production
- Implement proper firewall rules
- Consider VPN for internal SSO servers

### CORS Configuration
Ensure SSO server allows requests from your application domain:
```javascript
// SSO server CORS configuration example
app.use(cors({
  origin: [
    'http://192.168.1.15:3000',  // Development
    'https://logbook.company.com' // Production
  ],
  credentials: true
}));
```

## Best Practices

1. **Use Environment-Specific Configurations**
   - Separate `.env.development`, `.env.staging`, `.env.production`
   - Never use localhost URLs in production

2. **Validate Configuration on Startup**
   - Add configuration validation to application startup
   - Log configuration status for debugging

3. **Monitor SSO Connectivity**
   - Implement health checks for SSO endpoints
   - Set up alerts for SSO failures

4. **Document Environment Setup**
   - Maintain up-to-date environment documentation
   - Include setup instructions for new developers

## Example Complete Configuration

```env
# .env.development
DATABASE_URL="postgresql://user:pass@localhost:5432/logbook"

# SSO Dashboard URL - Used for login redirections
SSO_DASHBOARD_URL="http://192.168.1.6:3000"
NEXT_PUBLIC_SSO_DASHBOARD_URL="http://192.168.1.6:3000"

# SSO API URL - Used for API calls
SSO_API_URL="http://192.168.1.6:3000"
NEXT_PUBLIC_SSO_API_URL="http://192.168.1.6:3000"

# SSO General Configuration
SSO_ENABLED="true"
SSO_CALLBACK_URL="http://192.168.1.15:3000/api/auth/sso-callback"
NEXT_PUBLIC_SSO_CALLBACK_URL="http://192.168.1.15:3000/api/auth/sso-callback"
NEXT_PUBLIC_APP_URL="http://192.168.1.15:3000"

# Legacy support
SSO_BASE_URL="http://192.168.1.6:3000"
NEXT_PUBLIC_SSO_BASE_URL="http://192.168.1.6:3000"

# Other configurations...
EXTERNAL_API_KEY="your-api-key-here"
MARKETING_API_URL="http://192.168.1.9:3007/api/external"
MARKETING_API_KEY="your-marketing-api-key"
```
