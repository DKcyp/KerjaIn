/**
 * SSO Configuration Utility
 * Centralized configuration for SSO endpoints to avoid hardcoded URLs
 */

export interface SSOConfig {
  dashboardUrl: string;
  apiUrl: string;
  callbackUrl: string;
  appUrl: string;
  enabled: boolean;
}

/**
 * Get SSO configuration for server-side usage
 */
export function getServerSSOConfig(): SSOConfig {
  return {
    dashboardUrl: process.env.SSO_DASHBOARD_URL || process.env.SSO_BASE_URL || '',
    apiUrl: process.env.SSO_API_URL || process.env.SSO_BASE_URL || '',
    callbackUrl: process.env.SSO_CALLBACK_URL || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
    enabled: process.env.SSO_ENABLED === 'true'
  };
}

/**
 * Get SSO configuration for client-side usage
 */
export function getClientSSOConfig(): SSOConfig {
  return {
    dashboardUrl: process.env.NEXT_PUBLIC_SSO_DASHBOARD_URL || process.env.NEXT_PUBLIC_SSO_BASE_URL || '',
    apiUrl: process.env.NEXT_PUBLIC_SSO_API_URL || process.env.NEXT_PUBLIC_SSO_BASE_URL || '',
    callbackUrl: process.env.NEXT_PUBLIC_SSO_CALLBACK_URL || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
    enabled: process.env.SSO_ENABLED === 'true'
  };
}

/**
 * Validate SSO configuration
 */
export function validateSSOConfig(config: SSOConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.dashboardUrl) {
    errors.push('SSO Dashboard URL is not configured');
  }

  if (!config.apiUrl) {
    errors.push('SSO API URL is not configured');
  }

  if (!config.callbackUrl) {
    errors.push('SSO Callback URL is not configured');
  }

  if (!config.appUrl) {
    errors.push('App URL is not configured');
  }

  // Validate URL formats
  const urlFields = [
    { name: 'Dashboard URL', value: config.dashboardUrl },
    { name: 'API URL', value: config.apiUrl },
    { name: 'Callback URL', value: config.callbackUrl },
    { name: 'App URL', value: config.appUrl }
  ];

  urlFields.forEach(field => {
    if (field.value) {
      try {
        new URL(field.value);
      } catch {
        errors.push(`${field.name} is not a valid URL: ${field.value}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get SSO login URL for redirections
 */
export function getSSOLoginUrl(returnUrl?: string): string {
  const config = typeof window !== 'undefined' ? getClientSSOConfig() : getServerSSOConfig();
  
  if (!config.dashboardUrl) {
    throw new Error('SSO Dashboard URL is not configured');
  }

  const url = new URL('/sso', config.dashboardUrl);
  if (returnUrl) {
    url.searchParams.set('return_url', returnUrl);
  }
  
  return url.toString();
}

/**
 * Get SSO API endpoint URL
 */
export function getSSOApiUrl(endpoint: string): string {
  const config = typeof window !== 'undefined' ? getClientSSOConfig() : getServerSSOConfig();
  
  if (!config.apiUrl) {
    throw new Error('SSO API URL is not configured');
  }

  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  return new URL(cleanEndpoint, config.apiUrl).toString();
}

/**
 * Get SSO logout URL
 */
export function getSSOLogoutUrl(): string {
  return getSSOApiUrl('/auth/logout');
}

/**
 * Get SSO user profile URL
 */
export function getSSOProfileUrl(): string {
  return getSSOApiUrl('/auth/verify');
}

/**
 * Get SSO token refresh URL
 */
export function getSSORefreshUrl(): string {
  return getSSOApiUrl('/auth/refresh');
}

/**
 * Get SSO session check URL
 */
export function getSSOSessionCheckUrl(): string {
  return getSSOApiUrl('/auth/me');
}

/**
 * Log SSO configuration (for debugging)
 */
export function logSSOConfig(): void {
  const config = typeof window !== 'undefined' ? getClientSSOConfig() : getServerSSOConfig();
  const validation = validateSSOConfig(config);
  
  console.log('🔧 SSO Configuration Debug:', {
    environment: typeof window !== 'undefined' ? 'CLIENT' : 'SERVER',
    dashboardUrl: config.dashboardUrl,
    apiUrl: config.apiUrl,
    callbackUrl: config.callbackUrl,
    appUrl: config.appUrl,
    enabled: config.enabled,
    bypassForDev: process.env.SSO_BYPASS_FOR_DEV,
    validation: validation.valid ? 'Valid' : 'Invalid',
    errors: validation.errors,
    // Show what the actual URLs will be
    loginUrl: getSSOLoginUrl(config.callbackUrl),
    logoutUrl: getSSOLogoutUrl(),
    profileUrl: getSSOProfileUrl()
  });
}
