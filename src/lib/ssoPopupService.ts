/**
 * SSO Tab Service
 * Handles SSO authentication in new tabs with automatic redirection
 */

import { getClientSSOConfig, getSSOLoginUrl, getSSOSessionCheckUrl } from './ssoConfig';

export interface SSOTabOptions {
  timeout?: number; // in milliseconds
}

export interface SSOResult {
  success: boolean;
  error?: string;
  user?: any;
}

export class SSOTabService {
  private static instance: SSOTabService;
  private tab: Window | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  static getInstance(): SSOTabService {
    if (!SSOTabService.instance) {
      SSOTabService.instance = new SSOTabService();
    }
    return SSOTabService.instance;
  }

  /**
   * Open SSO login in new tab and handle authentication
   */
  async loginWithTab(options: SSOTabOptions = {}): Promise<SSOResult> {
    const {
      timeout = 300000 // 5 minutes
    } = options;

    return new Promise((resolve) => {
      try {
        // Close any existing tab
        this.closeTab();

        // Build SSO URL using configuration
        const config = getClientSSOConfig();
        const callbackUrl = `${config.callbackUrl}?tab=true`;
        const ssoUrl = getSSOLoginUrl(callbackUrl);

        // Open new tab
        this.tab = window.open(
          ssoUrl,
          '_blank'
        );

        if (!this.tab) {
          resolve({
            success: false,
            error: 'Tab blocked. Please allow popups/tabs for this site and try again.'
          });
          return;
        }

        // Set up timeout
        const timeoutId = setTimeout(() => {
          this.closeTab();
          resolve({
            success: false,
            error: 'SSO login timed out. Please try again.'
          });
        }, timeout);

        // Listen for messages from tab
        this.messageListener = (event: MessageEvent) => {
          // Filter out non-SSO messages (browser extensions, dev tools, etc.)
          if (!event.data || !event.data.type || 
              (!event.data.type.startsWith('SSO_') && event.data.type !== 'SSO_SUCCESS' && event.data.type !== 'SSO_ERROR')) {
            return; // Ignore non-SSO messages
          }
          
          console.log('🔔 Received SSO message from tab:', {
            origin: event.origin,
            expectedOrigin: window.location.origin,
            data: event.data
          });
          
          // Verify origin for security
          if (event.origin !== window.location.origin) {
            console.warn('🚫 Message origin mismatch, ignoring:', event.origin);
            return;
          }

          if (event.data.type === 'SSO_SUCCESS') {
            clearTimeout(timeoutId);
            this.cleanup();
            resolve({
              success: true,
              user: event.data.user
            });
          } else if (event.data.type === 'SSO_ERROR') {
            clearTimeout(timeoutId);
            this.cleanup();
            resolve({
              success: false,
              error: event.data.error || 'SSO login failed'
            });
          }
        };

        window.addEventListener('message', this.messageListener);

        // Check if tab was closed manually
        const checkClosed = setInterval(() => {
          if (this.tab && this.tab.closed) {
            clearInterval(checkClosed);
            clearTimeout(timeoutId);
            this.cleanup();
            resolve({
              success: false,
              error: 'SSO login was cancelled'
            });
          }
        }, 1000);

      } catch (error) {
        console.error('SSO tab error:', error);
        resolve({
          success: false,
          error: 'Failed to open SSO login tab'
        });
      }
    });
  }

  /**
   * Close tab and cleanup
   */
  private closeTab(): void {
    if (this.tab && !this.tab.closed) {
      this.tab.close();
    }
    this.tab = null;
  }

  /**
   * Cleanup listeners and tab
   */
  private cleanup(): void {
    this.closeTab();
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }

  /**
   * Check if user is already authenticated
   */
  async checkExistingAuth(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        return !!data.user;
      }
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  /**
   * Check if there's an active SSO session
   */
  async checkSSOSession(): Promise<boolean> {
    try {
      // Use internal API endpoint that handles SSO token validation
      const response = await fetch('/api/auth/sso-check', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        return data?.authenticated === true;
      }
      return false;
    } catch (error) {
      console.error('SSO session check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const ssoTabService = SSOTabService.getInstance();