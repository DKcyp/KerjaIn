/**
 * RichzSpot API Service
 * Service untuk validasi jam kerja dari RichzSpot Jadwal API
 * 
 * Endpoint baru (Jadwal API):
 * - GET /api/jadwal/user?id_user=X&bulan=Y&tahun=Z  (jadwal per user bulanan)
 * - GET /api/jadwal/departemen?id_dep=X&bulan=Y&tahun=Z  (jadwal per departemen bulanan)
 * - GET /api/jadwal/range?tanggal_awal=X&tanggal_akhir=Y&id_user=Z&id_dep=W  (jadwal by range)
 * 
 * Base URL: RICHZSPOT_BE_URL (default: http://localhost:8074/richz-spot-be)
 */

import { getUserBreakTime } from '@/lib/breakTimeService';

/**
 * Check if Get Jadwal feature is enabled globally
 * Returns true if enabled, false if disabled
 */
export async function isGetJadwalEnabled(): Promise<boolean> {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Get the latest setting (should only be 1 record)
    const setting = await prisma.globalOnofGetJadwal.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    
    await prisma.$disconnect();
    
    // If no record exists, default to enabled
    if (!setting) {
      console.log('⚠️ [Get Jadwal] No setting found, defaulting to ENABLED');
      return true;
    }
    
    const isEnabled = setting.isEnabled;
    console.log(`🔧 [Get Jadwal] Feature is ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
    
    return isEnabled;
  } catch (error) {
    console.error('❌ [Get Jadwal] Error checking feature status:', error);
    // On error, default to enabled to maintain backward compatibility
    return true;
  }
}

interface WorkingHoursValidationResponse {
  success: boolean;
  isWorkingHours: boolean;
  currentTime: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  message?: string;
}

interface JadwalItem {
  id_user?: string;
  tanggal?: string;
  shift_jam_masuk?: string | null;
  shift_jam_pulang?: string | null;
  shift_tipe?: string;
  durasi_jam?: string | number | null;
  user_nama_lengkap?: string;
  [key: string]: any;
}

let cachedJWTToken: string | null = null;
let tokenExpiryTime: number = 0;

// Cache mapping: logbook pegawai ID → RichzSpot user_id (hash)
// Populated from login response data
let cachedRichzSpotUserId: string | null = null;

/**
 * Get RichzSpot base URL for Jadwal API
 */
function getRichzSpotBaseUrl(): string {
  return process.env.RICHZSPOT_BE_URL || 'https://richzspotjwt-dev.expressa.id';
}

/**
 * Get RichzSpot JWT API configuration from environment
 */
function getRichzSpotJWTConfig(): { jwtUrl: string } {
  const jwtUrl = process.env.JWT_API_URL || process.env.SPOT_JWT_BASE_URL || process.env.RICHZSPOT_BE_URL;

  if (!jwtUrl) {
    throw new Error('JWT_API_URL or SPOT_JWT_BASE_URL or RICHZSPOT_BE_URL not configured');
  }

  // Ensure URL ends with /
  const normalizedUrl = jwtUrl.endsWith('/') ? jwtUrl : `${jwtUrl}/`;

  return { jwtUrl: normalizedUrl };
}

/**
 * Clear cached token (used when token is invalid)
 */
function clearTokenCache(): void {
  console.log(`🔄 [RichzSpot JWT] Clearing token cache`);
  cachedJWTToken = null;
  tokenExpiryTime = 0;
  cachedRichzSpotUserId = null;
}

/**
 * Resolve logbook pegawai ID to RichzSpot user_id (hash string)
 * Uses SSO login to get the RichzSpot user_id from login response
 * Caches the mapping for performance
 */
const richzSpotUserIdCache = new Map<number, string>();

export async function getRichzSpotUserId(pegawaiId: number): Promise<string | null> {
  // Check cache first
  if (richzSpotUserIdCache.has(pegawaiId)) {
    return richzSpotUserIdCache.get(pegawaiId)!;
  }

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const pegawai = await prisma.pegawai.findUnique({
      where: { id: pegawaiId },
      select: { username: true, ssoUserId: true }
    });

    await prisma.$disconnect();

    if (!pegawai?.username || !pegawai?.ssoUserId) {
      console.warn(`⚠️ [RichzSpot] User ${pegawaiId} has no username or ssoUserId`);
      return null;
    }

    // Login as this specific user to get their RichzSpot user_id
    const config = getRichzSpotJWTConfig();
    const loginUrl = `${config.jwtUrl}auth/login_sso_token`;

    console.log(`🔍 [RichzSpot] Resolving RichzSpot user_id for pegawai ${pegawaiId} (${pegawai.username})`);

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: pegawai.username,
        token: pegawai.ssoUserId,
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ [RichzSpot] Login failed for user ${pegawai.username}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status && data.data?.user_id) {
      const richzSpotId = data.data.user_id;
      richzSpotUserIdCache.set(pegawaiId, richzSpotId);
      console.log(`✅ [RichzSpot] Resolved pegawai ${pegawaiId} → RichzSpot user_id: ${richzSpotId}`);
      
      // Also cache the token if we don't have one
      if (!cachedJWTToken && data.token) {
        cachedJWTToken = data.token;
        tokenExpiryTime = Date.now() + 3600000;
      }
      
      return richzSpotId;
    }

    return null;
  } catch (error) {
    console.error(`❌ [RichzSpot] Failed to resolve user_id for pegawai ${pegawaiId}:`, error);
    return null;
  }
}

/**
 * Get JWT token from RichzSpot JWT API using SSO token login
 * Endpoint: POST {JWT_API_URL}auth/login_sso_token
 * Body: { username: "khoirul@exp", token: "<ssoUserId from pegawai>" }
 * 
 * Flow:
 * 1. Ambil pegawai dari database (yang punya username + ssoUserId)
 * 2. Login ke RichzSpot JWT pakai username + ssoUserId sebagai token
 * 3. Cache JWT token untuk 1 jam
 */
async function getJWTToken(forceRefresh: boolean = false): Promise<string> {
  try {
    const config = getRichzSpotJWTConfig();
    const now = Date.now();

    // Return cached token if still valid (with 5 min buffer)
    if (!forceRefresh && cachedJWTToken && tokenExpiryTime > now + 300000) {
      console.log(`🔐 [RichzSpot JWT] Using cached token`);
      return cachedJWTToken;
    }

    // Get username and ssoUserId from database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Find a user with both username and ssoUserId (prefer SUPER_ADMIN/PM for broader access)
    const serviceUser = await prisma.pegawai.findFirst({
      where: {
        username: { not: null },
        ssoUserId: { not: null }
      },
      select: { username: true, ssoUserId: true },
      orderBy: { id: 'asc' }
    });

    await prisma.$disconnect();

    if (!serviceUser?.username || !serviceUser?.ssoUserId) {
      throw new Error('No user found with username and ssoUserId for JWT login');
    }

    const loginUsername = serviceUser.username;
    const ssoToken = serviceUser.ssoUserId;

    // Login ke JWT API menggunakan SSO token endpoint
    const loginUrl = `${config.jwtUrl}auth/login_sso_token`;
    console.log(`🔐 [RichzSpot JWT] Requesting token via SSO login: ${loginUrl}`);
    console.log(`   Username: ${loginUsername}`);

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: loginUsername,
        token: ssoToken,
      }),
    });

    console.log(`   Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [RichzSpot JWT] SSO login failed: ${response.status}`);
      console.error(`   Error: ${errorText.substring(0, 200)}`);
      throw new Error(`JWT SSO login failed: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();

    // Validate response format
    if (typeof data.status === 'undefined') {
      console.error(`❌ [RichzSpot JWT] Invalid response format - no status field:`, data);
      throw new Error('Invalid response format - no status field');
    }

    if (data.status === false) {
      const errorMessage = data.message || 'Unknown error';
      console.error(`❌ [RichzSpot JWT] SSO login failed: ${errorMessage}`);
      throw new Error(`SSO login failed: ${errorMessage}`);
    }

    if (!data.token) {
      console.error(`❌ [RichzSpot JWT] No token in response:`, data);
      throw new Error('Invalid response - no token in response');
    }

    // Cache token for 1 hour
    cachedJWTToken = data.token;
    tokenExpiryTime = now + 3600000;

    // Cache RichzSpot user_id from login response (for Jadwal API calls)
    if (data.data?.user_id) {
      cachedRichzSpotUserId = data.data.user_id;
      console.log(`   RichzSpot user_id cached: ${cachedRichzSpotUserId}`);
    }

    console.log(`✅ [RichzSpot JWT] Token obtained via SSO login (length: ${data.token.length})`);
    return data.token;
  } catch (error) {
    console.error('❌ [RichzSpot JWT] Failed to get JWT token:', error);
    clearTokenCache();
    throw error;
  }
}

/**
 * Get jadwal data for a user in a specific month
 * Endpoint: GET /api/jadwal/user?id_user=X&bulan=Y&tahun=Z
 */
export async function getJadwalByUser(userId: string, bulan: number, tahun: number): Promise<JadwalItem[]> {
  try {
    const baseUrl = getRichzSpotBaseUrl();
    const token = await getJWTToken();

    const url = `${baseUrl}/api/jadwal/user?id_user=${userId}&bulan=${bulan}&tahun=${tahun}`;
    console.log(`📅 [Jadwal API] GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jadwal API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.status || !data.data) {
      throw new Error(`Jadwal API returned no data for user ${userId} bulan ${bulan}/${tahun}`);
    }

    console.log(`✅ [Jadwal API] Got ${data.total || data.data.length} jadwal entries for user ${userId}`);
    return data.data as JadwalItem[];
  } catch (error) {
    console.error('❌ [Jadwal API] Failed to get jadwal by user:', error);
    throw error;
  }
}

/**
 * Get jadwal data for a date range
 * Endpoint: GET /api/jadwal/range?tanggal_awal=X&tanggal_akhir=Y&sso_user_id=Z
 * NO AUTH REQUIRED - identifikasi user via sso_user_id
 */
export async function getJadwalByRange(
  tanggalAwal: string,
  tanggalAkhir: string,
  options?: { idUser?: string; ssoUserId?: string; idDep?: string }
): Promise<JadwalItem[]> {
  try {
    const baseUrl = getRichzSpotBaseUrl();

    let url = `${baseUrl}/api/jadwal/range?tanggal_awal=${tanggalAwal}&tanggal_akhir=${tanggalAkhir}`;
    if (options?.ssoUserId) url += `&sso_user_id=${options.ssoUserId}`;
    else if (options?.idUser) url += `&sso_user_id=${options.idUser}`;
    if (options?.idDep) url += `&id_dep=${options.idDep}`;

    console.log(`📅 [Jadwal API] GET ${url}`);

    // No auth needed - API is public, identifies user via sso_user_id
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jadwal API range error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.status || !data.data) {
      throw new Error(`Jadwal API range returned no data`);
    }

    console.log(`✅ [Jadwal API] Got ${data.total || data.data.length} jadwal entries for range ${tanggalAwal} - ${tanggalAkhir}`);
    return data.data as JadwalItem[];
  } catch (error) {
    console.error('❌ [Jadwal API] Failed to get jadwal by range:', error);
    throw error;
  }
}

/**
 * Get jadwal data for a departemen in a specific month
 * Endpoint: GET /api/jadwal/departemen?id_dep=X&bulan=Y&tahun=Z
 */
export async function getJadwalByDepartemen(idDep: string, bulan: number, tahun: number): Promise<JadwalItem[]> {
  try {
    const baseUrl = getRichzSpotBaseUrl();
    const token = await getJWTToken();

    const url = `${baseUrl}/api/jadwal/departemen?id_dep=${idDep}&bulan=${bulan}&tahun=${tahun}`;
    console.log(`📅 [Jadwal API] GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jadwal API departemen error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.status || !data.data) {
      throw new Error(`Jadwal API returned no data for departemen ${idDep} bulan ${bulan}/${tahun}`);
    }

    console.log(`✅ [Jadwal API] Got ${data.total || data.data.length} jadwal entries for departemen ${idDep}`);
    return data.data as JadwalItem[];
  } catch (error) {
    console.error('❌ [Jadwal API] Failed to get jadwal by departemen:', error);
    throw error;
  }
}

/**
 * Validate if current time is within working hours via Jadwal API
 * Uses /api/jadwal/user endpoint to get today's schedule
 */
export async function validateWorkingHours(): Promise<WorkingHoursValidationResponse> {
  try {
    const isEnabled = await isGetJadwalEnabled();
    const now = new Date();

    if (!isEnabled) {
      console.log(`⚠️ [RichzSpot] Feature is DISABLED - bypassing validation`);
      return {
        success: true,
        isWorkingHours: true,
        currentTime: now.toISOString(),
        workingHoursStart: '00:00',
        workingHoursEnd: '23:59',
        message: 'Validasi jadwal dimatikan (Feature Disabled)'
      };
    }

    console.log(`🕐 [RichzSpot] Validating working hours via Jadwal API`);

    // Use a generic check - get today's schedule
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();
    const todayStr = `${tahun}-${bulan.toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    // Try to get jadwal for today using range endpoint (no specific user - uses token's user)
    const baseUrl = getRichzSpotBaseUrl();
    const token = await getJWTToken();

    const url = `${baseUrl}/api/jadwal/range?tanggal_awal=${todayStr}&tanggal_akhir=${todayStr}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ [RichzSpot] Jadwal API not available (${response.status})`);
      throw new Error(`Jadwal API not available: ${response.status}`);
    }

    const data = await response.json();

    if (data.status && data.data && data.data.length > 0) {
      const todaySchedule = data.data[0];
      
      if (todaySchedule.shift_jam_masuk && todaySchedule.shift_jam_pulang) {
        const startTime = todaySchedule.shift_jam_masuk.substring(0, 5);
        const endTime = todaySchedule.shift_jam_pulang.substring(0, 5);
        
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        
        const isWorkingHours = currentMin >= startMin && currentMin < endMin;

        console.log(`✅ [RichzSpot] Working hours validation result:`, {
          isWorkingHours,
          currentTime: now.toISOString(),
          workingHours: `${startTime} - ${endTime}`
        });

        return {
          success: true,
          isWorkingHours,
          currentTime: now.toISOString(),
          workingHoursStart: startTime,
          workingHoursEnd: endTime,
          message: isWorkingHours ? 'Dalam jam kerja' : `Luar jam kerja (${startTime} - ${endTime})`
        };
      }
    }

    // No schedule for today (holiday)
    return {
      success: true,
      isWorkingHours: false,
      currentTime: now.toISOString(),
      workingHoursStart: '00:00',
      workingHoursEnd: '00:00',
      message: 'Hari libur - tidak ada jadwal kerja'
    };
  } catch (error) {
    console.error('❌ [RichzSpot] Failed to validate working hours:', error);

    // Fallback: return default working hours (06:00 - 17:00)
    const now = new Date();
    const currentHour = now.getHours();
    const isWorkingHours = currentHour >= 6 && currentHour < 17;

    console.warn(`⚠️ [RichzSpot] Using fallback working hours validation: ${isWorkingHours}`);

    return {
      success: false,
      isWorkingHours,
      currentTime: now.toISOString(),
      workingHoursStart: '06:00',
      workingHoursEnd: '17:00',
      message: 'Jadwal API not available, using fallback validation (06:00 - 17:00)'
    };
  }
}

/**
 * Check if a specific time is within working hours
 * Uses Jadwal API range endpoint for the specific date
 */
export async function isTimeWithinWorkingHours(time: Date): Promise<boolean> {
  try {
    const isEnabled = await isGetJadwalEnabled();
    
    if (!isEnabled) {
      return true; // Bypassed validation
    }

    const year = time.getFullYear();
    const month = (time.getMonth() + 1).toString().padStart(2, '0');
    const day = time.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const baseUrl = getRichzSpotBaseUrl();
    const token = await getJWTToken();

    const url = `${baseUrl}/api/jadwal/range?tanggal_awal=${dateStr}&tanggal_akhir=${dateStr}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Jadwal API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status && data.data && data.data.length > 0) {
      const schedule = data.data[0];
      if (schedule.shift_jam_masuk && schedule.shift_jam_pulang) {
        const [startH, startM] = schedule.shift_jam_masuk.substring(0, 5).split(':').map(Number);
        const [endH, endM] = schedule.shift_jam_pulang.substring(0, 5).split(':').map(Number);
        const currentMin = time.getHours() * 60 + time.getMinutes();
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        
        return currentMin >= startMin && currentMin < endMin;
      }
    }

    return false; // Holiday or no schedule
  } catch (error) {
    console.error('❌ [RichzSpot] Failed to check time:', error);

    // Fallback
    const hour = time.getHours();
    return hour >= 8 && hour < 17;
  }
}

/**
 * Get user's working hours for a specific date from Jadwal API
 * Uses endpoint: GET /api/jadwal/range?tanggal_awal=X&tanggal_akhir=X&id_user=Y
 * If the date is a holiday (no shift), throws error so caller can skip
 */
export async function getUserWorkingHours(userId: string, date: Date): Promise<{
  startTime: string;
  endTime: string;
  breakStartTime?: string;
  breakEndTime?: string;
  shiftType: string;
  shiftName: string;
}> {
  try {
    // Check if Get Jadwal feature is enabled
    const isEnabled = await isGetJadwalEnabled();

    if (!isEnabled) {
      console.log(`⚠️ [Jadwal API] Feature is DISABLED - using hardcoded fallback schedule`);
      // Throw so smartScheduling falls back to getFallbackSchedule()
      // which has the correct hours: Mon-Fri 08:00-16:00, Sat 07:30-10:30
      throw new Error('GetJadwal feature is disabled');
    }

    // Format date in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    console.log(`\n📅 [Jadwal API] Getting working hours for user ${userId} on ${dateStr}`);

    // Get ssoUserId from database to use as identifier in Jadwal API
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const pegawai = await prisma.pegawai.findUnique({
      where: { id: parseInt(userId) },
      select: { ssoUserId: true, username: true }
    });
    await prisma.$disconnect();

    if (!pegawai?.ssoUserId) {
      console.warn(`⚠️ [Jadwal API] User ${userId} has no ssoUserId - cannot query jadwal`);
      throw new Error(`User ${userId} not linked to RichzSpot (no ssoUserId)`);
    }

    // Get jadwal using sso_user_id parameter (no auth needed)
    const jadwalData = await getJadwalByRange(dateStr, dateStr, { ssoUserId: pegawai.ssoUserId });

    if (!jadwalData || jadwalData.length === 0) {
      // Throw as Holiday-like error so smartScheduling skips this day
      throw new Error(`Holiday: ${dateStr} has no schedule data in Jadwal API`);
    }

    const item = jadwalData[0];

    // If shift times are null, it's a holiday - throw so caller can skip
    if (!item.shift_jam_masuk || !item.shift_jam_pulang) {
      console.log(`   ⏭️ ${dateStr} is a holiday (shift_tipe: ${item.shift_tipe}, shift_jam_masuk: ${item.shift_jam_masuk}, shift_jam_pulang: ${item.shift_jam_pulang})`);
      throw new Error(`Holiday: ${dateStr} has no shift (shift_tipe: ${item.shift_tipe})`);
    }

    const schedule = item;

    console.log(`   Schedule Found for ${dateStr}:`, {
      shift_jam_masuk: schedule.shift_jam_masuk,
      shift_jam_pulang: schedule.shift_jam_pulang,
      shift_tipe: schedule.shift_tipe,
      user_nama_lengkap: schedule.user_nama_lengkap,
      durasi_jam: schedule.durasi_jam
    });

    // Get break time from master
    const breakTime = await getUserBreakTime(parseInt(userId));
    console.log(`   Break Time from Master:`, breakTime);

    // Parse time format (HH:MM:SS to HH:MM)
    const startTime = schedule.shift_jam_masuk!.substring(0, 5); // "09:00:00" -> "09:00"
    const endTime = schedule.shift_jam_pulang!.substring(0, 5);   // "12:00:00" -> "12:00"

    console.log(`✅ [Jadwal API] Working hours successfully retrieved:`, {
      startTime,
      endTime,
      breakStartTime: breakTime?.startTime,
      breakEndTime: breakTime?.endTime,
      shiftType: schedule.shift_tipe,
      shiftName: schedule.shift_tipe === 'p' ? 'Pagi' : schedule.shift_tipe === 's' ? 'Siang' : 'Malam',
      durationHours: schedule.durasi_jam,
      userName: schedule.user_nama_lengkap
    });
    console.log(`\n`);

    return {
      startTime,
      endTime,
      breakStartTime: breakTime?.startTime,
      breakEndTime: breakTime?.endTime,
      shiftType: schedule.shift_tipe || 'p',
      shiftName: schedule.shift_tipe === 'p' ? 'Pagi' : schedule.shift_tipe === 's' ? 'Siang' : 'Malam'
    };
  } catch (error) {
    // Re-throw holiday errors so caller (smartScheduling) can skip the day
    if (error instanceof Error && error.message.startsWith('Holiday:')) {
      throw error;
    }

    console.error('❌ [Jadwal API] Failed to get user working hours:', error);
    console.error(`   Error Details:`, error instanceof Error ? error.message : String(error));
    console.log(`   Falling back to default working hours (08:00 - 16:00)\n`);

    // Fallback to default working hours — throw so smartScheduling uses getFallbackSchedule()
    console.log(`   Throwing to trigger smartScheduling fallback schedule\n`);
    throw error;
  }
}

/**
 * Check if a specific time is within working hours for a user
 * Excludes break time
 */
export async function isTimeWithinUserWorkingHours(userId: string, time: Date): Promise<boolean> {
  try {
    const workingHours = await getUserWorkingHours(userId, time);

    // Parse time strings (HH:MM:SS format)
    const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
    const [endHour, endMin] = workingHours.endTime.split(':').map(Number);

    const currentHour = time.getHours();
    const currentMin = time.getMinutes();

    // Convert to minutes for easier comparison
    const currentTotalMin = currentHour * 60 + currentMin;
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;

    // Check if in break time
    let isInBreakTime = false;
    if (workingHours.breakStartTime && workingHours.breakEndTime) {
      const [breakStartHour, breakStartMin] = workingHours.breakStartTime.split(':').map(Number);
      const [breakEndHour, breakEndMin] = workingHours.breakEndTime.split(':').map(Number);
      
      const breakStartTotalMin = breakStartHour * 60 + breakStartMin;
      const breakEndTotalMin = breakEndHour * 60 + breakEndMin;
      
      isInBreakTime = currentTotalMin >= breakStartTotalMin && currentTotalMin < breakEndTotalMin;
    }

    // Handle overnight shifts (e.g., 23:00 - 08:00)
    let isWithinWorkingHours = false;
    if (endTotalMin < startTotalMin) {
      isWithinWorkingHours = currentTotalMin >= startTotalMin || currentTotalMin < endTotalMin;
    } else {
      isWithinWorkingHours = currentTotalMin >= startTotalMin && currentTotalMin < endTotalMin;
    }

    // Return true only if within working hours AND not in break time
    return isWithinWorkingHours && !isInBreakTime;
  } catch (error) {
    console.error('❌ [RichzSpot] Failed to check user working hours:', error);

    // Fallback: 06:00 - 17:00
    const hour = time.getHours();
    const totalMin = hour * 60 + time.getMinutes();
    const isInWorkingHours = totalMin >= 360 && totalMin < 1020;
    const isInBreak = false; // Disable break time check on fallback
    
    return isInWorkingHours;
  }
}
