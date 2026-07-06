/**
 * Centralized WhatsApp Notification Service
 * Handles all WhatsApp messages throughout the application
 */

interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g., "6281234567890")
  message: string;
  taskId?: number;
  notificationType?: 'sla_overdue' | 'sla_warning' | 'task_assigned' | 'task_review' | 'task_created' | 'daily_summary' | 'task_auto_stop';
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ✅ DEDUPLICATION CACHE - Prevent duplicate WhatsApp messages
// Key format: "taskId-notificationType-phoneNumber-messageHash"
// Value: timestamp of last sent message
const whatsappCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 60000; // 60 seconds - prevent duplicate within 1 minute

// ✅ LOCK MECHANISM - Prevent race condition (simultaneous requests)
// Key format: same as cache
// Value: Promise that resolves when message is sent
const whatsappLocks = new Map<string, Promise<WhatsAppResponse>>();

/**
 * Generate simple hash from string (for cache key)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Acquire lock for sending message (prevents race condition)
 * Returns existing promise if message is already being sent
 */
function acquireLock(
  cacheKey: string,
  sendFunction: () => Promise<WhatsAppResponse>
): Promise<WhatsAppResponse> {
  // Check if there's already a message being sent
  const existingLock = whatsappLocks.get(cacheKey);
  if (existingLock) {
    console.log(`🔒 [WhatsApp Lock] BLOCKED - Message already being sent`);
    console.log(`   Cache Key: ${cacheKey}`);
    return existingLock;
  }

  // Create new lock
  const lockPromise = sendFunction().finally(() => {
    // Release lock after message is sent (or failed)
    whatsappLocks.delete(cacheKey);
    
    // Cleanup old cache entries (older than 2 minutes)
    const now = Date.now();
    for (const [key, timestamp] of whatsappCache.entries()) {
      if (now - timestamp > 120000) {
        whatsappCache.delete(key);
      }
    }
  });

  whatsappLocks.set(cacheKey, lockPromise);
  return lockPromise;
}

/**
 * Check if message should be sent (deduplication)
 */
function shouldSendMessage(
  phoneNumber: string,
  message: string,
  taskId: number | undefined,
  notificationType: string | undefined
): boolean {
  // If no taskId or type, always send (can't deduplicate)
  if (!taskId || !notificationType) {
    return true;
  }

  // Generate cache key with message hash to prevent duplicate messages with different content
  const messageHash = simpleHash(message);
  const cacheKey = `${taskId}-${notificationType}-${phoneNumber}-${messageHash}`;
  const now = Date.now();
  const lastSent = whatsappCache.get(cacheKey);

  if (lastSent && (now - lastSent) < DEDUP_WINDOW_MS) {
    const secondsAgo = Math.floor((now - lastSent) / 1000);
    console.log(`⏭️  [WhatsApp Dedup] BLOCKED - Same message sent ${secondsAgo}s ago`);
    console.log(`   Cache Key: ${cacheKey}`);
    return false;
  }

  return true;
}

/**
 * Centralized WhatsApp message sender
 * Uses wa.expressa.id service
 */
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[WhatsApp] 📱 Starting WhatsApp message send process');
    console.log('[WhatsApp] Type:', message.notificationType || 'general');
    console.log('[WhatsApp] Task ID:', message.taskId || 'N/A');
    console.log('[WhatsApp] Original number:', message.to);
    
    // Clean phone number using existing normalization logic
    const cleanNumber = cleanPhoneNumber(message.to);
    console.log('[WhatsApp] Cleaned number:', cleanNumber || 'FAILED TO CLEAN');
    
    if (!cleanNumber) {
      console.warn('[WhatsApp] ❌ Invalid phone number:', message.to);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { success: false, error: 'Invalid phone number format' };
    }

    // Generate cache key for deduplication and locking (include message hash)
    const messageHash = simpleHash(message.message);
    const cacheKey = message.taskId && message.notificationType 
      ? `${message.taskId}-${message.notificationType}-${cleanNumber}-${messageHash}`
      : `${Date.now()}-${Math.random()}-${cleanNumber}`; // Fallback for messages without taskId

    // ✅ DEDUPLICATION CHECK (time-based + content-based)
    if (!shouldSendMessage(cleanNumber, message.message, message.taskId, message.notificationType)) {
      console.log('[WhatsApp] ⏭️  Message blocked by deduplication (time-based + content-based)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return { 
        success: true, 
        messageId: 'dedup_blocked',
        error: 'Duplicate message blocked'
      };
    }

    // ✅ LOCK MECHANISM - Prevent race condition (simultaneous requests)
    // If another request is already sending the same message, wait for it
    return await acquireLock(cacheKey, async () => {
      // Double-check after acquiring lock (in case another request just finished)
      if (!shouldSendMessage(cleanNumber, message.message, message.taskId, message.notificationType)) {
        console.log('[WhatsApp] ⏭️  Message blocked after lock (another request just sent it)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { 
          success: true, 
          messageId: 'dedup_blocked_after_lock',
          error: 'Duplicate message blocked after lock'
        };
      }

      // Mark as sent BEFORE actually sending (to prevent race condition)
      if (message.taskId && message.notificationType) {
        whatsappCache.set(cacheKey, Date.now());
      }
      
      const payload = {
        number: cleanNumber,
        message: message.message,
      };

      console.log('[WhatsApp] 📤 Message Payload:');
      console.log('[WhatsApp] To:', cleanNumber);
      console.log('[WhatsApp] Message Preview:');
      console.log('┌─────────────────────────────────────────┐');
      console.log(message.message);
      console.log('└─────────────────────────────────────────┘');
      console.log('[WhatsApp] Message Length:', message.message.length, 'characters');

      // 🔧 DEVELOPMENT MODE: Skip actual API call for local testing
      const isDevelopment = process.env.NODE_ENV === 'development';
      const skipWA = process.env.SKIP_WHATSAPP === 'true';
      
      if (skipWA) {
        console.log('[WhatsApp] 🧪 SKIP MODE - Skipping actual WA API call');
        console.log('[WhatsApp] ✅ Message would be sent to:', cleanNumber);
        console.log('[WhatsApp] ✅ Simulated success (local test only)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { 
          success: true, 
          messageId: `wa_dev_${Date.now()}_${Math.random().toString(36).slice(2)}` 
        };
      }

      // Send to WhatsApp service (production)
      const WHATSAPP_API_URL = 'https://wa.expressa.id/send';
      console.log('[WhatsApp] 📤 Sending to WhatsApp API:', WHATSAPP_API_URL);
      console.log('[WhatsApp] Recipient:', cleanNumber);

      const response = await fetch(WHATSAPP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: cleanNumber,
          message: message.message
        })
      });

      const result = await response.text().catch(() => '');
      
      console.log('[WhatsApp] 📥 Response status:', response.status);
      console.log('[WhatsApp] Response body:', result);
      
      if (response.ok) {
        console.log(`[WhatsApp] ✅ Message sent successfully!`);
        console.log('[WhatsApp] Details:', {
          to: cleanNumber,
          taskId: message.taskId,
          type: message.notificationType,
          messageLength: message.message.length
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return { 
          success: true, 
          messageId: `wa_${Date.now()}_${Math.random().toString(36).slice(2)}` 
        };
      } else {
        console.error('[WhatsApp] ❌ API error!');
        console.error('[WhatsApp] Status:', response.status);
        console.error('[WhatsApp] Body:', result);
        console.error('[WhatsApp] To:', cleanNumber);
        console.error('[WhatsApp] Type:', message.notificationType);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Remove from cache if failed to send
        if (message.taskId && message.notificationType) {
          whatsappCache.delete(cacheKey);
        }
        
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${result || 'Unknown error'}` 
        };
      }
    }); // End of acquireLock
  } catch (error) {
    console.error('[WhatsApp] ❌ Service error!');
    console.error('[WhatsApp] Error:', error);
    console.error('[WhatsApp] Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * Send WhatsApp message with simple interface (backward compatibility)
 */
export async function sendSimpleWhatsApp(number: string, message: string, type?: string): Promise<boolean> {
  const result = await sendWhatsAppMessage({
    to: number,
    message,
    notificationType: type as any
  });
  return result.success;
}

/**
 * Format SLA overdue notification messagea
 */
export function formatSLAOverdueMessage(task: {
  id: number;
  kode: string;
  proyekNama: string;
  moduleNama: string;
  pegawaiNama: string;
  taskComplexity: string;
  assigneeStartTaskDeadline: Date;
  overdueMinutes: number;
}): string {
  const overdueTime = formatDuration(task.overdueMinutes);
  
  return `🚨 *TUGAS TERLAMBAT - PERINGATAN SLA*

📋 *Kode Tugas:* ${task.kode}
🏢 *Proyek:* ${task.proyekNama}
📁 *Modul:* ${task.moduleNama}
👤 *Ditugaskan kepada:* ${task.pegawaiNama}
⚡ *Tingkat Kesulitan:* ${task.taskComplexity}

⏰ *Batas Waktu:* ${formatDateTime(task.assigneeStartTaskDeadline)}
🔴 *Terlambat:* ${overdueTime}

Mohon segera mulai mengerjakan tugas ini untuk memenuhi tenggat waktu proyek.

_(Pesan otomatis dari Richz-Log)_`;
}

/**
 * Format SLA warning notification message (before overdue)
 */
export function formatSLAWarningMessage(task: {
  id: number;
  kode: string;
  proyekNama: string;
  moduleNama: string;
  pegawaiNama: string;
  taskComplexity: string;
  assigneeStartTaskDeadline: Date;
  remainingMinutes: number;
}): string {
  const remainingTime = formatDuration(task.remainingMinutes);
  
  return `⚠️ *BATAS WAKTU TUGAS MENDEKAT*

📋 *Kode Tugas:* ${task.kode}
🏢 *Proyek:* ${task.proyekNama}
📁 *Modul:* ${task.moduleNama}
👤 *Ditugaskan kepada:* ${task.pegawaiNama}
⚡ *Tingkat Kesulitan:* ${task.taskComplexity}

⏰ *Batas Waktu:* ${formatDateTime(task.assigneeStartTaskDeadline)}
🟡 *Waktu tersisa:* ${remainingTime}

Mohon segera mulai mengerjakan tugas ini untuk menghindari pelanggaran SLA.

_(Pesan otomatis dari Richz-Log)_`;
}

/**
 * Format PM review notification message
 */
export function formatPMReviewMessage(task: {
  id: number;
  kode: string;
  proyekNama: string;
  moduleNama: string;
  pegawaiNama: string;
  pmNama: string;
  taskComplexity: string;
  keterangan?: string;
}): string {
  return `📋 *TASK SIAP UNTUK REVIEW*

${task.pmNama},

Sebuah task telah dikirim untuk review:

🏢 *Proyek:* ${task.proyekNama}
📁 *Modul:* ${task.moduleNama}
🔢 *Kode Task:* ${task.kode}
👤 *Dikerjakan oleh:* ${task.pegawaiNama}
⚡ *Tingkat Kesulitan:* ${task.taskComplexity}${task.keterangan ? `
📝 *Keterangan:* ${task.keterangan}` : ''}

Mohon segera lakukan review untuk melanjutkan proses development.

_(Pesan otomatis dari Richz-Log)_`;
}

/**
 * Format CRM task creation notification
 */
export function formatCRMTaskMessage(task: {
  kode: string;
  proyekNama: string;
  proyekKode: string;
  modulePath: string;
  pmNama: string;
  tanggal: string;
  keterangan?: string;
}): string {
  return `Halo ${task.pmNama}, telah dibuat task dari CRM:
- Proyek: ${task.proyekNama} (kode: ${task.proyekKode})
- Modul: ${task.modulePath}
- Kode Task: ${task.kode}
- Tanggal: ${task.tanggal}${task.keterangan ? `
- Keterangan: ${task.keterangan}` : ''}

Catatan: data dari CRM, tolong sesuaikan modul dan usernya.

_(Pesan Otomatis dari Richz-Log)_`;
}

/**
 * Format task assignment notification
 */
export function formatTaskAssignmentMessage(task: {
  id: number;
  kode: string;
  proyekNama: string;
  moduleNama: string;
  pegawaiNama: string;
  taskComplexity: string;
  assigneeStartTaskDeadline: Date;
  scheduleAt: Date;
  keterangan?: string;
  calculatedDueDate?: Date;
}): string {
  // Get current hour to determine greeting
  const currentHour = new Date().getHours();
  let greeting = 'Selamat pagi';
  if (currentHour >= 12 && currentHour < 15) {
    greeting = 'Selamat siang';
  } else if (currentHour >= 15 && currentHour < 18) {
    greeting = 'Selamat sore';
  } else if (currentHour >= 18 || currentHour < 6) {
    greeting = 'Selamat malam';
  }

  // Format date as DD-MM-YYYY HH:mm
  const formatScheduleDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  return `${greeting} ${task.pegawaiNama}, Anda ditugaskan untuk task ini.

Kode: ${task.kode}
Modul: ${task.moduleNama}${task.keterangan ? `
Keterangan: ${task.keterangan}` : ''}

Task dijadwalkan pada :
Jadwal    : ${formatScheduleDate(task.scheduleAt)}${task.calculatedDueDate ? `
Due date : ${formatScheduleDate(task.calculatedDueDate)}` : ''}

(Pesan otomatis dari Richz-Log)`;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} menit`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
  }
}

/**
 * Format date and time in Indonesian format
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  }).format(date);
}

/**
 * Clean phone number format for WhatsApp (matches existing codebase format)
 * Converts various formats to international format without +
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Use the same normalization logic as existing codebase
  let n = String(phone).replace(/[^0-9+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0')) n = '62' + n.slice(1);
  
  // Return valid Indonesian number or original if invalid
  return n.match(/^\d{7,18}$/) ? n : phone;
}
