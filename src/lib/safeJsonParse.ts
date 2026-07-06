// Utility function for safe JSON parsing from fetch responses
export async function safeJsonParse(response: Response): Promise<any> {
  try {
    // First check if response is ok
    if (!response.ok) {
      console.error('HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const text = await response.text();
    if (!text.trim()) {
      return null;
    }
    
    // Check if response looks like HTML (common error page format)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        preview: text.substring(0, 100) + '...'
      });
      return { error: 'Server returned HTML instead of JSON' };
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parse error:', {
      error,
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    return { error: 'Invalid JSON response' };
  }
}

// Helper function for fetch with safe JSON parsing
export async function fetchJson(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const response = await fetch(url, options);
    const data = await safeJsonParse(response);
    
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    console.error('Fetch error:', error);
    return {
      ok: false,
      status: 0,
      data: { error: 'Network error' }
    };
  }
}

// Simple wrapper for common fetch + JSON pattern
export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, options);
    return await safeJsonParse(response);
  } catch (error) {
    console.error('Safe fetch error:', error);
    return { error: 'Network error' };
  }
}
