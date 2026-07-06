import { prisma } from '@/lib/prisma';
import { refreshSSOToken, validateSSOToken, SSOError } from '@/lib/sso';

/**
 * Check if user's SSO token is still valid and refresh if needed
 */
export async function ensureValidSSOSession(userId: number): Promise<{
  isValid: boolean;
  needsRefresh: boolean;
  error?: string;
}> {
  try {
    const user = await (prisma as any).pegawai.findUnique({
      where: { id: userId },
      select: {
        id: true,
        ssoAccessToken: true,
        ssoRefreshToken: true,
        ssoTokenExpiry: true
      }
    });

    if (!user || !user.ssoAccessToken) {
      return { isValid: false, needsRefresh: false, error: 'No SSO token found' };
    }

    // Check if token is expired
    const now = new Date();
    const expiry = new Date(user.ssoTokenExpiry);
    const isExpired = expiry <= now;
    const willExpireSoon = expiry <= new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    if (isExpired) {
      // Try to refresh the token
      if (user.ssoRefreshToken) {
        try {
          const ssoResponse = await refreshSSOToken({
            refresh_token: user.ssoRefreshToken
          });

          // Update user with new tokens
          await (prisma as any).pegawai.update({
            where: { id: userId },
            data: {
              ssoAccessToken: ssoResponse.access_token,
              ssoRefreshToken: ssoResponse.refresh_token,
              ssoTokenExpiry: new Date(Date.now() + ssoResponse.expires_in * 1000),
            }
          });

          return { isValid: true, needsRefresh: false };
        } catch (error) {
          // Clear invalid tokens
          await clearSSOTokens(userId);
          return { isValid: false, needsRefresh: false, error: 'Token refresh failed' };
        }
      } else {
        return { isValid: false, needsRefresh: false, error: 'No refresh token available' };
      }
    }

    if (willExpireSoon) {
      return { isValid: true, needsRefresh: true };
    }

    // Validate token with SSO server
    const isTokenValid = await validateSSOToken(user.ssoAccessToken);
    if (!isTokenValid) {
      await clearSSOTokens(userId);
      return { isValid: false, needsRefresh: false, error: 'Token is invalid' };
    }

    return { isValid: true, needsRefresh: false };
  } catch (error) {
    console.error('Error checking SSO session:', error);
    return { isValid: false, needsRefresh: false, error: 'Session check failed' };
  }
}

/**
 * Clear SSO tokens from user record
 */
export async function clearSSOTokens(userId: number): Promise<void> {
  try {
    await (prisma as any).pegawai.update({
      where: { id: userId },
      data: {
        ssoAccessToken: null,
        ssoRefreshToken: null,
        ssoTokenExpiry: null,
      }
    });
  } catch (error) {
    console.error('Error clearing SSO tokens:', error);
  }
}

/**
 * Get SSO session info for a user
 */
export async function getSSOSessionInfo(userId: number): Promise<{
  hasSSO: boolean;
  isValid: boolean;
  expiresAt?: Date;
  expiresIn?: number; // seconds until expiry
}> {
  try {
    const user = await (prisma as any).pegawai.findUnique({
      where: { id: userId },
      select: {
        ssoAccessToken: true,
        ssoTokenExpiry: true
      }
    });

    if (!user || !user.ssoAccessToken) {
      return { hasSSO: false, isValid: false };
    }

    const now = new Date();
    const expiry = new Date(user.ssoTokenExpiry);
    const isValid = expiry > now;
    const expiresIn = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));

    return {
      hasSSO: true,
      isValid,
      expiresAt: expiry,
      expiresIn
    };
  } catch (error) {
    console.error('Error getting SSO session info:', error);
    return { hasSSO: false, isValid: false };
  }
}

/**
 * Refresh SSO token for a user
 */
export async function refreshUserSSOToken(userId: number): Promise<{
  success: boolean;
  error?: string;
  expiresIn?: number;
}> {
  try {
    const user = await (prisma as any).pegawai.findUnique({
      where: { id: userId },
      select: {
        ssoRefreshToken: true
      }
    });

    if (!user || !user.ssoRefreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    const ssoResponse = await refreshSSOToken({
      refresh_token: user.ssoRefreshToken
    });

    await (prisma as any).pegawai.update({
      where: { id: userId },
      data: {
        ssoAccessToken: ssoResponse.access_token,
        ssoRefreshToken: ssoResponse.refresh_token,
        ssoTokenExpiry: new Date(Date.now() + ssoResponse.expires_in * 1000),
      }
    });

    return { success: true, expiresIn: ssoResponse.expires_in };
  } catch (error) {
    if (error instanceof SSOError) {
      await clearSSOTokens(userId);
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Token refresh failed' };
  }
}
