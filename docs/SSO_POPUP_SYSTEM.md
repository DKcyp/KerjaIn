# SSO Popup Authentication System

This document describes the automatic SSO popup authentication system implemented for the Logbook application.

## Overview

The system automatically redirects users to SSO authentication using popup windows instead of showing the traditional signin form. This provides a seamless authentication experience where:

1. Users visit the signin page
2. A popup window automatically opens for SSO authentication
3. After successful authentication, the popup closes automatically
4. Users are redirected to the dashboard

## Architecture

### Components

1. **SSO Popup Service** (`src/lib/ssoPopupService.ts`)
   - Handles popup window management
   - Manages message passing between popup and parent window
   - Provides authentication state checking

2. **Enhanced SignIn Form** (`src/components/auth/SignInForm.tsx`)
   - Automatically triggers SSO popup on page load
   - Provides retry and manual fallback options
   - Shows loading states and error handling

3. **Enhanced SSO Callback** (`src/app/api/auth/sso-callback/route.ts`)
   - Detects popup mode via `popup=true` parameter
   - Returns HTML that communicates with parent window
   - Automatically closes popup after authentication

## Flow Diagram

```
User visits /auth/signin
         ↓
Check existing authentication
         ↓
    Not authenticated
         ↓
Check existing SSO session
         ↓
Open SSO popup window
         ↓
User authenticates in popup
         ↓
SSO callback with popup=true
         ↓
Set session cookie & send message to parent
         ↓
Popup closes automatically
         ↓
Parent window redirects to dashboard
```

## Key Features

### Automatic Authentication
- No manual button clicks required
- Seamless user experience
- Automatic popup opening

### Popup Management
- Centered popup window (500x600px)
- Automatic popup blocking detection
- Manual close detection
- 5-minute timeout protection

### Message Passing
- Secure cross-window communication
- Origin validation for security
- Success/error message handling

### Error Handling
- Popup blocking detection
- Network error handling
- Timeout management
- Retry functionality
- Manual fallback option

### Security
- Origin validation for messages
- Secure cookie handling
- HTTPS support
- Session token protection

## Configuration

### Environment Variables

```env
# SSO Dashboard URL - Used for login redirections and user-facing SSO pages
SSO_DASHBOARD_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_DASHBOARD_URL=http://192.168.1.6:3000

# SSO API URL - Used for API calls like /me, token refresh, logout, etc.
SSO_API_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_API_URL=http://192.168.1.6:3000

# SSO General Configuration
SSO_ENABLED=true
SSO_CALLBACK_URL=http://192.168.1.15:3000/api/auth/sso-callback
NEXT_PUBLIC_SSO_CALLBACK_URL=http://192.168.1.15:3000/api/auth/sso-callback
NEXT_PUBLIC_APP_URL=http://192.168.1.15:3000

# Legacy support (will be removed in future versions)
SSO_BASE_URL=http://192.168.1.6:3000
NEXT_PUBLIC_SSO_BASE_URL=http://192.168.1.6:3000
```

### Popup Options

```typescript
interface SSOPopupOptions {
  width?: number;      // Default: 500
  height?: number;     // Default: 600
  timeout?: number;    // Default: 300000 (5 minutes)
}
```

## API Endpoints

### SSO Callback (Popup Mode)
- **URL**: `/api/auth/sso-callback?popup=true`
- **Method**: GET
- **Response**: HTML page that communicates with parent window

### Message Format

#### Success Message
```javascript
{
  type: 'SSO_SUCCESS',
  user: {
    id: number,
    username: string,
    namaLengkap: string,
    role: string
  }
}
```

#### Error Message
```javascript
{
  type: 'SSO_ERROR',
  error: string
}
```

## Usage Examples

### Basic Usage
```typescript
import { ssoPopupService } from '@/lib/ssoPopupService';

const result = await ssoPopupService.loginWithPopup();
if (result.success) {
  console.log('Login successful:', result.user);
} else {
  console.error('Login failed:', result.error);
}
```

### Check Authentication Status
```typescript
const isAuthenticated = await ssoPopupService.checkExistingAuth();
const hasSSOSession = await ssoPopupService.checkSSOSession();
```

## Error Scenarios

### Popup Blocked
- Browser blocks popup window
- User sees error message with retry option
- Manual SSO redirect available as fallback

### Network Errors
- SSO server unavailable
- Connection timeout
- Invalid response handling

### User Actions
- Manual popup close
- Authentication cancellation
- Session timeout

## Testing

### Test File
Use `test-sso-popup.html` to test popup functionality independently:

```bash
# Open in browser
open test-sso-popup.html
```

### Manual Testing Steps
1. Visit `/auth/signin`
2. Verify popup opens automatically
3. Complete SSO authentication
4. Verify popup closes and redirects to dashboard
5. Test error scenarios (popup blocking, network errors)

## Browser Compatibility

### Supported Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Popup Requirements
- JavaScript enabled
- Popup blocking disabled for the domain
- Cross-origin messaging support

## Security Considerations

### Message Origin Validation
```javascript
if (event.origin !== window.location.origin) {
  return; // Ignore messages from other origins
}
```

### Cookie Security
- HttpOnly cookies for session tokens
- Secure flag for HTTPS
- SameSite protection

### CSRF Protection
- Origin validation
- State parameter validation
- Session token verification

## Troubleshooting

### Common Issues

1. **Popup Blocked**
   - Solution: Allow popups for the domain
   - Fallback: Manual SSO redirect

2. **Authentication Loop**
   - Check SSO server configuration
   - Verify callback URL settings
   - Check session cookie settings

3. **Message Not Received**
   - Verify origin validation
   - Check browser console for errors
   - Ensure popup is not blocked

### Debug Mode
Enable debug logging:
```javascript
console.log('SSO Debug:', {
  popup: !!popup,
  origin: window.location.origin,
  ssoUrl: ssoUrl
});
```

## Migration Notes

### From Previous System
- Old signin form with manual SSO button removed
- Automatic popup replaces manual redirect
- Backward compatibility maintained for non-popup mode

### Breaking Changes
- Signin page no longer shows traditional form
- Popup blocking will prevent authentication
- Requires JavaScript enabled

## Performance

### Metrics
- Popup open time: ~200ms
- Authentication time: Depends on SSO server
- Redirect time: ~100ms
- Total flow: ~2-5 seconds

### Optimization
- Preload SSO service
- Cache authentication checks
- Minimize popup size
- Optimize callback response

## Future Enhancements

### Planned Features
- Remember popup preferences
- Multiple SSO provider support
- Mobile-optimized flow
- Offline detection

### Considerations
- WebAuthn integration
- Biometric authentication
- Single sign-out support
- Session management improvements
