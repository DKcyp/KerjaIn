/**
 * CRM Notification Service
 * 
 * Handles outgoing API calls to CRM system when tasks are completed in Logbook.
 * When a task with idCrm is marked as complete, this service notifies the CRM
 * to trigger PIC review process with multipart/form-data including image upload.
 */

interface CRMNotificationResponse {
  success: boolean;
  status?: boolean;
  message?: string;
  ticket?: {
    id: string;
    ticketNumber: string;
    status: string;
    dispositionStatus: string;
    assignedTo: string | null;
    attachmentId?: string;
  };
  error?: string;
}

/**
 * Notify CRM system that a task has been completed and needs PIC review
 * Sends multipart/form-data with optional image attachment
 * 
 * @param ticketId - CRM ticket ID (from task.idCrm)
 * @param logbookTaskId - Logbook task code
 * @param completedBy - Name of person who completed the task
 * @param completionNotes - Notes about completion
 * @param imageBuffer - Optional image buffer to upload
 * @param imageFilename - Optional image filename
 * @returns Promise with notification result
 */
export async function notifyCRMTaskCompleted(
  ticketId: string,
  logbookTaskId: string,
  tasklistId: string,
  completedBy: string,
  completionNotes: string,
  imageBuffer?: Buffer,
  imageFilename?: string
): Promise<{ success: boolean; error?: string; ticket?: any }> {
  try {
    const crmApiUrl = process.env.CRM_API_URL;
    const crmApiKey = process.env.CRM_API_KEY;

    if (!crmApiUrl) {
      console.error('[CRM Notification] CRM_API_URL not configured');
      return { success: false, error: 'CRM_API_URL not configured' };
    }

    if (!crmApiKey) {
      console.error('[CRM Notification] CRM_API_KEY not configured');
      return { success: false, error: 'CRM_API_KEY not configured' };
    }

    const endpoint = `${crmApiUrl}/hrd/api/tasklist_actions.php`;

    // Build multipart/form-data payload matching the PHP curl request
    const formDataPayload = new FormData();
    formDataPayload.append('apiKey', crmApiKey);
    formDataPayload.append('action', 'done');
    formDataPayload.append('id_tasklist', tasklistId);
    formDataPayload.append('note', completionNotes);
    formDataPayload.append('tasklist_update_php', '');
    formDataPayload.append('tasklist_update_db', '');

    // Add image/file if provided using key 'file'
    if (imageBuffer && imageFilename) {
      const arrayBuffer = imageBuffer.buffer.slice(
        imageBuffer.byteOffset,
        imageBuffer.byteOffset + imageBuffer.byteLength
      ) as ArrayBuffer;
      
      // Determine file type from extension, fallback to image/png
      const extension = imageFilename.split('.').pop()?.toLowerCase();
      let mimeType = 'image/png';
      if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
      else if (extension === 'gif') mimeType = 'image/gif';
      else if (extension === 'webp') mimeType = 'image/webp';

      const blob = new Blob([arrayBuffer], { type: mimeType });
      formDataPayload.append('file', blob, imageFilename);
    }

    console.log('[CRM Notification] Sending multipart/form-data notification to CRM:', {
      endpoint,
      ticketId,
      tasklistId,
      completedBy,
      hasFile: !!(imageBuffer && imageFilename)
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        // Note: Do NOT set Content-Type header manually when sending FormData,
        // the fetch API will automatically set it with the correct boundary.
        body: formDataPayload,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result: CRMNotificationResponse = await response.json();
      console.log("Response from CRM API:", JSON.stringify(result, null, 2));
      if (!response.ok) {
        console.error('[CRM Notification] CRM API returned error:', {
          status: response.status,
          error: result.error || 'Unknown error'
        });
        return {
          success: false,
          error: result.error || `CRM API returned status ${response.status}`
        };
      }

      if (result.status !== true) {
        console.error('[CRM Notification] CRM notification failed:', result.error);
        return { success: false, error: result.error || 'CRM API returned status false' };
      }

      console.log('[CRM Notification] Successfully notified CRM:', {
        ticketId,
        ticketNumber: result.ticket?.ticketNumber,
        status: result.ticket?.status,
        dispositionStatus: result.ticket?.dispositionStatus,
        attachmentId: result.ticket?.attachmentId
      });

      return { success: true, ticket: result.ticket };

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('[CRM Notification] Request timeout after 30 seconds');
        return { success: false, error: 'Request timeout' };
      }
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error('[CRM Notification] Error notifying CRM:', error);
    return {
      success: false,
      error: error.message || 'Failed to notify CRM'
    };
  }
}

export async function clockInTask(idCrm: string): Promise<{ success: boolean; error?: string; ticket?: any }> {
  try {
    const crmApiUrl = process.env.CRM_API_URL;
    const crmApiKey = process.env.CRM_API_KEY;

    if (!crmApiUrl) {
      console.error('[CRM Notification] CRM_API_URL not configured');
      return { success: false, error: 'CRM_API_URL not configured' };
    }

    if (!crmApiKey) {
      console.error('[CRM Notification] CRM_API_KEY not configured');
      return { success: false, error: 'CRM_API_KEY not configured' };
    }

    const endpoint = `${crmApiUrl}/hrd/api/tasklist_actions.php`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const payload = {
      action: 'clock',
      clock_action: 'in',
      id_tasklist: idCrm,
      noteDone: '',
      apiKey: crmApiKey
    };

    try {
      console.log('Clockin to CRM');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result: CRMNotificationResponse = await response.json();
      if (!response.ok) {
        console.error('[CRM Notification] CRM API returned error:', {
          status: response.status,
          error: result.error || 'Unknown error'
        });
        return { success: false, error: result.error || `CRM API returned status ${response.status}` };
      }

      console.log('[CRM Notification] Successfully notified CRM:', {
        ticketId: idCrm,
        ticketNumber: result.ticket?.ticketNumber,
        status: result.ticket?.status,
        dispositionStatus: result.ticket?.dispositionStatus,
        attachmentId: result.ticket?.attachmentId
      });

      return { success: true, ticket: result.ticket };

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('[CRM Notification] Request timeout after 30 seconds');
        return { success: false, error: 'Request timeout' };
      }
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error('[CRM Notification] Error notifying CRM:', error);
    return {
      success: false,
      error: error.message || 'Failed to notify CRM'
    };
  }
}

export async function clockOutTask(idCrm: string): Promise<{ success: boolean; error?: string; ticket?: any }> {
  try {
    const crmApiUrl = process.env.CRM_API_URL;
    const crmApiKey = process.env.CRM_API_KEY;

    if (!crmApiUrl) {
      console.error('[CRM Notification] CRM_API_URL not configured');
      return { success: false, error: 'CRM_API_URL not configured' };
    }

    if (!crmApiKey) {
      console.error('[CRM Notification] CRM_API_KEY not configured');
      return { success: false, error: 'CRM_API_KEY not configured' };
    }

    const endpoint = `${crmApiUrl}/hrd/api/tasklist_actions.php`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const payload = {
      action: 'clock',
      clock_action: 'out',
      id_tasklist: idCrm,
      noteDone: '',
      apiKey: crmApiKey
    };

    try {
      console.log('Clockout to CRM')
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result: CRMNotificationResponse = await response.json();
      if (!response.ok) {
        console.error('[CRM Notification] CRM API returned error:', {
          status: response.status,
          error: result.error || 'Unknown error'
        });
        return { success: false, error: result.error || `CRM API returned status ${response.status}` };
      }

      console.log('[CRM Notification] Successfully notified CRM:', {
        ticketId: idCrm,
        ticketNumber: result.ticket?.ticketNumber,
        status: result.ticket?.status,
        dispositionStatus: result.ticket?.dispositionStatus,
        attachmentId: result.ticket?.attachmentId
      });

      return { success: true, ticket: result.ticket };

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('[CRM Notification] Request timeout after 30 seconds');
        return { success: false, error: 'Request timeout' };
      }
      
      throw fetchError;
    }

  } catch (error: any) {
    console.error('[CRM Notification] Error notifying CRM:', error);
    return {
      success: false,
      error: error.message || 'Failed to notify CRM'
    };
  }
}

/**
 * Check if a task should trigger CRM notification
 * 
 * @param task - Task object with ticket_id or idCrm field
 * @returns true if task has CRM ticket ID
 */
export function shouldNotifyCRM(task: { ticket_id?: string | null; ticketId?: string | null; idCrm?: string | null }): boolean {
  // Check new field first (ticket_id or ticketId), then fall back to legacy idCrm
  const ticketId = (task as any).ticket_id || (task as any).ticketId || task.idCrm;
  return !!(ticketId && String(ticketId).trim());
}

/**
 * Get the ticket ID from a task object (supports both new and legacy fields)
 * 
 * @param task - Task object
 * @returns ticket ID string or null
 */
export function getTaskTicketId(task: any): string | null {
  const ticketId = task.ticket_id || task.ticketId || task.idCrm || task.id_crm;
  return ticketId ? String(ticketId).trim() : null;
}
