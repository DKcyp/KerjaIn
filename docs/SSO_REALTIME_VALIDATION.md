# SSO Real-Time Validation System

This document describes the comprehensive real-time SSO validation system that automatically checks SSO token validity whenever users interact with the application.

## Overview

The system provides multiple layers of SSO validation to ensure users are immediately logged out when their SSO session expires:

1. **Real-time Client-side Validation** - Checks on user interactions
2. **Navigation-based Validation** - Validates on page changes
3. **Focus/Visibility Validation** - Checks when users return to the application
4. **Periodic Validation** - Regular background checks
5. **Server-side Middleware** - Enhanced server-side validation

## Components

### 1. SSO Real-Time Validation Hook (`useSSORealTimeValidation`)

**Location**: `src/hooks/useSSORealTimeValidation.ts`

**Features**:
- **Navigation Checks**: Validates SSO token on every page navigation
- **Focus Checks**: Validates when user returns to browser tab
- **Click Tracking**: Validates after every 10 user clicks (rate limited)
- **Periodic Checks**: Validates every 3-5 minutes automatically
- **Refresh Handling**: Validates after page refresh/reload
- **Rate Limiting**: Prevents excessive API calls (max 1 check per minute)

### 2. SSO Guard Component (`SSOGuard`)

**Location**: `src/components/auth/SSOGuard.tsx`

**Purpose**: Wraps the admin layout to provide automatic SSO validation

### 3. Enhanced Middleware

**Location**: `src/middleware.ts`

**Enhancements**:
- Adds SSO validation headers for client-side processing
- Provides server-side validation triggers

### 4. Manual Validation Endpoint

**Location**: `src/app/api/auth/validate-sso/route.ts`

**Purpose**: Provides immediate SSO token validation for testing

## Validation Triggers

### Automatic Triggers
1. **Page Navigation** - Every route change
2. **Window Focus** - When user returns to browser tab
3. **User Clicks** - After every 10 clicks (rate limited)
4. **Periodic Timer** - Every 3-5 minutes
5. **Page Refresh** - After browser refresh/reload

### Manual Triggers
1. **Test Interface** - `/test-sso` page for debugging
2. **API Endpoint** - Direct API calls to `/api/auth/validate-sso`

## Testing

Access `/test-sso` to test real-time validation and monitor SSO status.

## Security Benefits

1. **Immediate Logout**: Users logged out within seconds of SSO expiration
2. **Multiple Validation Points**: Comprehensive coverage of user interactions
3. **Rate Limiting**: Prevents abuse and excessive API calls
4. **Comprehensive Logging**: Full audit trail of validation events
