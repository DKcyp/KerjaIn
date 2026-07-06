/**
 * Richz Portal SSO Integration
 * Cookie-based authentication using NextAuth session
 */

export interface PortalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface PortalSSOResponse {
  authenticated: boolean;
  user?: PortalUser;
}

/**
 * Verify user session with Portal SSO
 * Checks the NextAuth session cookie and subscription access
 */
export async function verifyPortalSession(cookieHeader?: string): Promise<PortalSSOResponse & { hasAccess?: boolean }> {
  try {
    const portalUrl = process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL;
    const appCode = process.env.PORTAL_APP_CODE || 'richz-log';
    
    if (!portalUrl) {
      console.error('[Portal SSO] PORTAL_URL not configured');
      return { authenticated: false };
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    // Try with app code first (subscription check)
    let response = await fetch(`${portalUrl}/api/sso/me?app=${appCode}`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    // If 403 (no subscription) or 404 (app not found), try without app parameter
    if (response.status === 403 || response.status === 404) {
      if (response.status === 403) {
        console.log(`[Portal SSO] No subscription for "${appCode}", trying without app parameter`);
      } else {
        console.log(`[Portal SSO] App code "${appCode}" not found, trying without app parameter`);
      }
      response = await fetch(`${portalUrl}/api/sso/me`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('[Portal SSO] Verification failed:', response.status, response.statusText, errorData);
      return { authenticated: false };
    }

    const data = await response.json();
    
    if (data.authenticated && data.user) {
      console.log('[Portal SSO] Verification successful:', data.user.email, '| hasAccess:', !!data.hasAccess);
      return {
        authenticated: true,
        user: data.user,
        hasAccess: !!data.hasAccess,
      };
    }

    return { authenticated: false };
  } catch (error) {
    console.error('[Portal SSO] Verification error:', error);
    return { authenticated: false };
  }
}

/**
 * Map Portal role to Logbook role
 */
export function mapPortalRole(portalRole: string): 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN' {
  const roleMap: Record<string, 'SUPER_ADMIN' | 'PM' | 'PROGRAMMER' | 'ADMIN'> = {
    'Super Admin': 'SUPER_ADMIN',
    'Project Manager': 'PM',
    'Developer': 'PROGRAMMER',
    'Programmer': 'PROGRAMMER',
    'User': 'PROGRAMMER', // Map User role to PROGRAMMER
    'Admin': 'ADMIN',
  };

  return roleMap[portalRole] || 'PROGRAMMER'; // Default to PROGRAMMER instead of ADMIN
}

/**
 * Get Portal login URL
 */
export function getPortalLoginUrl(returnUrl?: string): string {
  const portalUrl = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_PORTAL_URL 
    : process.env.PORTAL_URL;
    
  if (!portalUrl) {
    throw new Error('PORTAL_URL not configured');
  }

  const url = new URL('/login', portalUrl);
  if (returnUrl) {
    url.searchParams.set('callbackUrl', returnUrl);
  }

  return url.toString();
}

/**
 * Get Portal dashboard URL
 */
export function getPortalDashboardUrl(): string {
  const portalUrl = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_PORTAL_URL 
    : process.env.PORTAL_URL;
    
  if (!portalUrl) {
    throw new Error('PORTAL_URL not configured');
  }

  return portalUrl;
}

/**
 * Check if Portal SSO is enabled
 */
export function isPortalSSOEnabled(): boolean {
  return process.env.SSO_ENABLED === 'true' && 
         process.env.SSO_BYPASS_FOR_DEV !== 'true';
}

export interface HubDepartment {
  dep_id: string;
  dep_nama: string;
  dep_logo: string | null;
  dep_icon: string | null;
  dep_website: string | null;
  dep_email: string | null;
  dep_telepon: string | null;
  dep_description: string | null;
  [key: string]: any;
}

/**
 * Fetch department details from Hub
 * @param depId - Department ID (e.g. "001.032.014.001")
 * @returns Department data including logo URL, or null if not found
 */
export async function fetchHubDepartment(depId: string): Promise<HubDepartment | null> {
  try {
    const portalUrl = process.env.PORTAL_URL || process.env.NEXT_PUBLIC_PORTAL_URL;
    const apiKey = process.env.HUB_API_KEY || 'akds@nbxh@as';
    if (!portalUrl) {
      console.error('[Hub Department] PORTAL_URL not configured');
      return null;
    }

    const response = await fetch(`${portalUrl}/api/external/departments?dep_id=${encodeURIComponent(depId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`[Hub Department] Failed to fetch department ${depId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) {
      console.log(`[Hub Department] Fetched department: ${data.data.dep_nama}, logo: ${data.data.dep_logo || 'none'}`);
      return data.data;
    }

    return null;
  } catch (error) {
    console.error('[Hub Department] Fetch error:', error);
    return null;
  }
}
