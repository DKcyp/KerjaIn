/**
 * Marketing Service
 * Handles API calls to the marketing system when blueprints are approved
 */

interface MarketingApiPayload {
  projectCode: string; // Required by marketing API
  action: string; // Required by marketing API
  projectId: string;
  projectName: string;
  customerName: string;
  blueprintId: number;
  approvedAt: string;
  approvedBy: number;
  companyName?: string;
}

interface MarketingApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Send blueprint approval notification to marketing system
 */
export async function notifyMarketingBlueprintApproved(payload: MarketingApiPayload): Promise<MarketingApiResponse> {
  const marketingUrl = process.env.MARKETING_API_URL;
  const marketingApiKey = process.env.MARKETING_API_KEY;

  if (!marketingUrl || !marketingApiKey) {
    console.warn('Marketing API configuration missing. Skipping marketing notification.');
    return {
      success: false,
      message: 'Marketing API configuration missing'
    };
  }

  try {
    console.log('Sending blueprint approval notification to marketing system:', {
      url: marketingUrl,
      projectId: payload.projectId,
      blueprintId: payload.blueprintId
    });

    const endpoint = process.env.MARKETING_BLUEPRINT_ENDPOINT || '/contracts/update-status';
    const response = await fetch(`${marketingUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': marketingApiKey,
        'Origin': 'http://192.168.1.15:3000',
        'User-Agent': 'Richz-Log-System/1.0'
      },
      body: JSON.stringify(payload),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 seconds timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Marketing API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return {
        success: false,
        message: `Marketing API error: ${response.status} ${response.statusText}`
      };
    }

    const result = await response.json();
    console.log('Marketing API success:', result);

    return {
      success: true,
      message: 'Marketing notification sent successfully',
      data: result
    };

  } catch (error) {
    console.error('Failed to notify marketing system:', error);
    
    // Don't throw error - we don't want marketing API failures to break blueprint approval
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Send Go Live completion notification to marketing system
 */
export async function notifyMarketingGoLiveCompleted(payload: MarketingApiPayload): Promise<MarketingApiResponse> {
  const marketingUrl = process.env.MARKETING_API_URL;
  const marketingApiKey = process.env.MARKETING_API_KEY;

  if (!marketingUrl || !marketingApiKey) {
    console.warn('Marketing API configuration missing. Skipping Go Live marketing notification.');
    return {
      success: false,
      message: 'Marketing API configuration missing'
    };
  }

  try {
    console.log('Sending Go Live completion notification to marketing system:', {
      url: marketingUrl,
      projectId: payload.projectId,
      projectCode: payload.projectCode
    });

    const endpoint = process.env.MARKETING_GOLIVE_ENDPOINT || '/contracts/update-status-development';
    const response = await fetch(`${marketingUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': marketingApiKey,
        'Origin': 'http://192.168.1.15:3000',
        'User-Agent': 'Richz-Log-System/1.0'
      },
      body: JSON.stringify(payload),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000) // 30 seconds timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Marketing API error (Go Live):', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return {
        success: false,
        message: `Marketing API error: ${response.status} ${response.statusText}`
      };
    }

    const result = await response.json();
    console.log('Marketing API success (Go Live):', result);

    return {
      success: true,
      message: 'Go Live marketing notification sent successfully',
      data: result
    };

  } catch (error) {
    console.error('Failed to notify marketing system (Go Live):', error);
    
    // Don't throw error - we don't want marketing API failures to break Go Live completion
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Prepare marketing payload from blueprint and project data
 */
export function prepareMarketingPayload(
  blueprint: any,
  project: any,
  approvedBy: number
): MarketingApiPayload {
  return {
    projectCode: project.kodeProyek || project.id.toString(), // Required field
    action: 'approve', // Required field - marketing API expects "approve" or "reject"
    projectId: project.kodeProyek || project.id.toString(),
    projectName: project.namaProyek,
    customerName: project.client || project.customerName || 'Unknown',
    blueprintId: blueprint.id,
    approvedAt: new Date().toISOString(),
    approvedBy,
    companyName: project.companyName
  };
}

/**
 * Prepare marketing payload for Go Live completion
 */
export function prepareGoLiveMarketingPayload(
  goLive: any,
  project: any,
  completedBy: number
): MarketingApiPayload {
  return {
    projectCode: project.kodeProyek || project.id.toString(), // Required field
    action: 'approve', // Required field - marketing API expects "approve" or "reject"
    projectId: project.kodeProyek || project.id.toString(),
    projectName: project.namaProyek,
    customerName: project.client || project.customerName || 'Unknown',
    blueprintId: 0, // Go Live doesn't have blueprint ID, use 0 as placeholder
    approvedAt: new Date().toISOString(),
    approvedBy: completedBy,
    companyName: project.companyName
  };
}
