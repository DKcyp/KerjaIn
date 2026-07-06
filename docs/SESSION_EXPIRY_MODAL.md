# Session Expiry Modal System

This document describes the implementation of the session expiry modal system that shows a user-friendly modal instead of automatically redirecting to the signin page when SSO tokens expire.

## Overview

The system provides a better user experience by:
- Showing a modal with "Sesi Anda Telah Selesai" message when tokens expire
- Preventing automatic redirects that can be jarring to users
- Allowing users to choose when to re-login
- Automatically validating tokens on user interactions and page visibility changes

## Components

### 1. SessionExpiryModal Component
**Location**: `src/components/auth/SessionExpiryModal.tsx`

A modal that appears when the user's session expires:
- **Title**: "Sesi Anda Telah Selesai"
- **Message**: Explains that the session has ended for security reasons
- **Button**: "Login Kembali" - redirects to signin page
- **Behavior**: Cannot be closed by clicking outside or pressing Escape

### 2. Enhanced AuthContext
**Location**: `src/context/AuthContext.tsx`

**New Features**:
- `showSessionExpired` state to control modal visibility
- `handleRelogin()` function to handle re-login process
- Automatic token validation on user interactions (click, keydown, mousemove, scroll)
- Token validation when page becomes visible again
- Throttled validation (max once per minute on interactions)

**Key Changes**:
- Replaced `forceLogout` with `sessionExpired` handling
- Shows modal instead of immediate redirect
- Added event listeners for user activity and page visibility

### 3. Updated API Endpoints

**`/api/auth/me`** and **`/api/auth/sso-refresh`**:
- Return `sessionExpired: true` instead of `forceLogout: true`
- Maintains same token clearing and cookie management behavior

## Utility Components

### 1. useTokenValidation Hook
**Location**: `src/hooks/useTokenValidation.ts`

Provides functions for manual token validation:
```typescript
const { validateToken, validateAndExecute, isTokenValid } = useTokenValidation();

// Validate token before action
const isValid = await validateToken();

// Validate and execute action
await validateAndExecute(async () => {
  // Your action here
});
```

### 2. withTokenValidation HOC
**Location**: `src/components/auth/withTokenValidation.tsx`

Higher-order component for automatic token validation:
```typescript
const MyComponent = withTokenValidation(OriginalComponent, {
  validateOnMount: true,      // Validate when component mounts
  validateOnFocus: true,      // Validate when window gains focus
  validateInterval: 300000,   // Validate every 5 minutes
});
```

## Token Validation Triggers

The system automatically validates tokens in these scenarios:

1. **User Interactions** (throttled to once per minute):
   - Mouse clicks
   - Keyboard input
   - Mouse movement
   - Page scrolling

2. **Page Visibility Changes**:
   - When user switches back to the tab
   - When browser window gains focus

3. **Component Lifecycle**:
   - When components wrapped with `withTokenValidation` mount
   - At specified intervals for wrapped components

4. **Manual Validation**:
   - Using `useTokenValidation` hook
   - Calling `reload()` from AuthContext

## User Experience Flow

1. **Normal Operation**: User interacts with the application normally
2. **Token Expiry**: SSO token expires on the server
3. **Detection**: Next API call to `/api/auth/me` detects invalid token
4. **Modal Display**: "Sesi Anda Telah Selesai" modal appears
5. **User Choice**: User clicks "Login Kembali" when ready
6. **Re-login**: User is redirected to signin page for fresh authentication

## Benefits

- **No Surprise Redirects**: Users aren't suddenly redirected while working
- **Clear Communication**: Modal explains what happened and why
- **User Control**: Users decide when to re-login
- **Automatic Detection**: Tokens are validated proactively
- **Consistent Experience**: Same modal appears regardless of how expiry is detected

## Testing

Use the test script `test-session-expiry.js` in browser console:

```javascript
// Simulate session expiry
simulateSessionExpiry();

// Test automatic validation
testTokenValidation();
```

## Configuration

### Environment Variables
No additional environment variables required. Uses existing SSO configuration.

### Validation Intervals
- **User Activity Throttling**: 60 seconds (1 minute)
- **Server-side Validation**: 30 minutes (production) / 2 minutes (development)
- **Component Validation**: 5 minutes (default, configurable)

## Security Considerations

- Tokens are still validated server-side with the same frequency
- Session cookies are cleared immediately when expiry is detected
- Database tokens are cleared when validation fails
- Circuit breaker prevents rapid successive validations
- All existing security measures remain in place

## Migration Notes

- Existing `forceLogout` handling is replaced with `sessionExpired`
- No breaking changes to existing authentication flow
- Modal is automatically included in AuthProvider
- Backward compatible with existing SSO configuration

## Files Modified

- `src/context/AuthContext.tsx` - Enhanced with modal and validation
- `src/app/api/auth/me/route.ts` - Returns sessionExpired flag
- `src/app/api/auth/sso-refresh/route.ts` - Returns sessionExpired flag

## Files Created

- `src/components/auth/SessionExpiryModal.tsx` - Modal component
- `src/hooks/useTokenValidation.ts` - Validation hook
- `src/components/auth/withTokenValidation.tsx` - HOC for automatic validation
- `test-session-expiry.js` - Testing utilities
- `docs/SESSION_EXPIRY_MODAL.md` - This documentation
