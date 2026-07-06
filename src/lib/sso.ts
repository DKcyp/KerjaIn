import { 
  SSOLoginRequest, 
  SSOLoginResponse, 
  SSOUserProfileResponse,
  SSORefreshRequest,
  SSORefreshResponse,
  SSOLogoutRequest
} from '@/types/sso';
import { getServerSSOConfig, getSSOApiUrl, getSSOProfileUrl, getSSORefreshUrl } from './ssoConfig';
import { NextRequest } from 'next/server';

export class SSOError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'SSOError';
  }
}

/**
 * Login to SSO server with username and password
 */
export async function loginWithSSO(request: SSOLoginRequest): Promise<SSOLoginResponse> {
  try {
    const loginUrl = getSSOApiUrl('/auth/login');
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SSOError(
        errorData.message || errorData.error || 'SSO login failed',
        response.status
      );
    }

    const data: SSOLoginResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof SSOError) {
      throw error;
    }
    throw new SSOError('Failed to connect to SSO server');
  }
}

/**
 * Refresh SSO access token using refresh token
 */
export async function refreshSSOToken(refreshData: SSORefreshRequest): Promise<SSORefreshResponse> {
  try {
    const refreshUrl = getSSORefreshUrl();
    
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refreshData),
    });
    

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SSOError(
        errorData.message || errorData.error || 'Token refresh failed',
        response.status
      );
    }

    const data: SSORefreshResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof SSOError) {
      throw error;
    }
    throw new SSOError('Failed to refresh SSO token');
  }
}

/**
 * Get user profile from SSO server using access token
 */
export async function getUserFromSSO(accessToken: string): Promise<SSOUserProfileResponse> {
  try {
    const profileUrl = getSSOProfileUrl();
    
    const response = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SSOError(
        errorData.message || errorData.error || 'Failed to get user profile',
        response.status
      );
    }

    const data: SSOUserProfileResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof SSOError) {
      throw error;
    }
    throw new SSOError('Failed to get user from SSO server');
  }
}

/**
 * Logout from SSO server
 */
export async function logoutFromSSO(request: SSOLogoutRequest & { access_token?: string }): Promise<void> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if access token is provided
    if (request.access_token) {
      headers['Authorization'] = `Bearer ${request.access_token}`;
    }
    
    const logoutUrl = getSSOApiUrl('/auth/logout');
    const response = await fetch(logoutUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refresh_token: request.refresh_token }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new SSOError(
        errorData.message || errorData.error || 'SSO logout failed',
        response.status
      );
    }
  } catch (error) {
    if (error instanceof SSOError) {
      throw error;
    }
    throw new SSOError('Failed to logout from SSO server');
  }
}

/**
 * Validate SSO token by making a request to SSO server
 */
export async function validateSSOToken(accessToken: string): Promise<boolean> {
  // Only log on server side (Node.js environment)
  if (typeof window === 'undefined') {
    console.log(`[SSO Server] ========== SSO TOKEN VALIDATION STARTED ==========`);
    console.log(`[SSO Server] SSO_ENABLED: ${process.env.SSO_ENABLED}`);
    console.log(`[SSO Server] SSO_BYPASS_FOR_DEV: ${process.env.SSO_BYPASS_FOR_DEV}`);
    console.log(`[SSO Server] Access token provided: ${!!accessToken}`);
    console.log(`[SSO Server] Access token length: ${accessToken?.length || 0}`);
  }
  
  try {
    const profileUrl = getSSOProfileUrl();
    
    // Only log on server side (Node.js environment)
    if (typeof window === 'undefined') {
      console.log(`[SSO Server] Validating token at endpoint: ${profileUrl}`);
      console.log(`[SSO Server] Using access token: ${accessToken?.substring(0, 20)}...`);
    }
    
    const response = await fetch(profileUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    // Get response body for debugging
    const responseText = await response.text();
    
    // Only log on server side (Node.js environment)
    if (typeof window === 'undefined') {
      console.log(`[SSO Server] Response status: ${response.status} ${response.statusText}`);
      console.log(`[SSO Server] Response headers:`, Object.fromEntries(response.headers.entries()));
      console.log(`[SSO Server] Response body:`, responseText);
    }
    
    // Try to parse as JSON for additional info
    let responseData = null;
    try {
      responseData = JSON.parse(responseText);
      if (typeof window === 'undefined') {
        console.log(`[SSO Server] Parsed response data:`, responseData);
      }
    } catch (parseError) {
      if (typeof window === 'undefined') {
        console.log(`[SSO Server] Response is not valid JSON:`, parseError);
      }
    }

    // Handle rate limiting and server errors gracefully
    if (response.status === 429) {
      console.warn(`[SSO] Rate limited (429) - treating as valid token to avoid logout loop`);
      return true; // Don't force logout on rate limit
    }

    // Handle server errors (5xx) gracefully in production
    if (response.status >= 500) {
      console.warn(`[SSO] Server error (${response.status}) - treating as valid token to avoid logout loop`);
      return true; // Don't force logout on server errors
    }

    // Handle authentication errors (401, 403)
    if (response.status === 401 || response.status === 403) {
      console.error(`[SSO] Token validation failed: ${response.status} ${response.statusText}`);
      return false;
    }

    // Handle other client errors (4xx) - be stricter
    if (response.status >= 400 && response.status < 500) {
      console.error(`[SSO] Client error (${response.status}) - token is invalid`);
      return false; // Treat client errors as invalid tokens
    }

    if (!response.ok) {
      console.error(`[SSO] Token validation failed: ${response.status} ${response.statusText}`);
      return false;
    }

    // Additional validation: check response content for logout indicators
    if (responseData) {
      // Check for common logout/invalid indicators in response
      const responseStr = JSON.stringify(responseData).toLowerCase();
      const logoutIndicators = ['logout', 'invalid', 'expired', 'unauthorized', 'forbidden', 'not authenticated'];
      
      for (const indicator of logoutIndicators) {
        if (responseStr.includes(indicator)) {
          console.warn(`[SSO] Response contains logout indicator '${indicator}': ${responseStr}`);
          return false;
        }
      }
      
      // Check if response has expected user data (adjust based on your SSO response format)
      // Handle nested user object structure from your SSO server
      const userData = responseData.user || responseData;
      if (!userData.id && !userData.user_id && !userData.sub && !userData.username) {
        console.warn(`[SSO] Response missing user identification data:`, responseData);
        return false;
      }
      
      if (typeof window === 'undefined') {
        console.log(`[SSO Server] User identification found - sub: ${userData.sub}, username: ${userData.username}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`[SSO] Token validation error:`, error);
    
    // Only be lenient with specific network errors in production
    if (process.env.NODE_ENV === 'production' && error instanceof Error && (
      error.name === 'TimeoutError' || 
      error.name === 'AbortError' ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ENOTFOUND')
    )) {
      console.warn(`[SSO] Network error in production - treating as valid token: ${error.message}`);
      return true;
    }
    
    // For all other errors, treat as invalid token
    console.error(`[SSO] Token validation failed due to error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Map SSO role to local role enum
 */
export function mapSSORole(ssoRole: string): 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN' {
  switch (ssoRole.toLowerCase()) {
    case 'sa':
    case 'super admin':
      return 'SUPER_ADMIN';
    case 'pm':
    case 'project manager':
      return 'PM';
    case 'dev':
    case 'developer':
    case 'programmer':
      return 'PROGRAMMER';
    default:
      return 'ADMIN';
  }
}

/**
 * Check if SSO is enabled
 */
export function isSSOEnabled(): boolean {
  const ssoEnabled = process.env.SSO_ENABLED === 'true';
  const ssoBypassForDev = process.env.SSO_BYPASS_FOR_DEV === 'true';
  
  // If bypass is enabled for development, disable SSO
  if (ssoBypassForDev) {
    return false;
  }
  
  return ssoEnabled;
}

/**
 * Check if SSO bypass is enabled for development
 */
export function isSSOBypassEnabled(): boolean {
  return process.env.SSO_BYPASS_FOR_DEV === 'true';
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || remoteAddr || '127.0.0.1';
}