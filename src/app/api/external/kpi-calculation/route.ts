import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

/**
 * API External untuk Kalkulasi KPI Programmer
 * Endpoint: GET /api/external/kpi-calculation
 * 
 * Query Parameters:
 * - pegawaiId (required for API Key auth, optional for session auth): ID programmer yang akan dihitung KPI-nya
 *   - Jika tidak ada, akan menggunakan user yang sedang login (session auth only)
 * - startDate (optional): Tanggal mulai periode (YYYY-MM-DD)
 * - endDate (optional): Tanggal akhir periode (YYYY-MM-DD)
 * - startTime (optional): Jam mulai (HH:mm, default: 00:00)
 * - endTime (optional): Jam akhir (HH:mm, default: 23:59)
 * 
 * Authorization: 
 * - Option 1: Session Cookie (for web dashboard)
 * - Option 2: X-API-KEY header (for RichzSpot mobile / external apps)
 *   - EXTERNAL_API_KEY: Full access (like SUPER_ADMIN)
 *   - RICHZLOG_PM_API_KEY: PM-level access
 */

export async function GET(request: NextRequest) {
  try {
    // --- Authentication ---
    // Check for API Key first, then fall back to session cookie
    const apiKey = request.headers.get('x-api-key');
    
    let session: { id: number; role: string } | null = null;
    let isApiKeyAuth = false;

    if (apiKey) {
      // API Key authentication
      const validApiKey = process.env.EXTERNAL_API_KEY;
      const validPmApiKey = process.env.RICHZLOG_PM_API_KEY;

      if (apiKey === validApiKey) {
        // Full access (SUPER_ADMIN level)
        session = { id: 0, role: 'SUPER_ADMIN' };
        isApiKeyAuth = true;
        console.log('📊 [KPI] Authenticated via EXTERNAL_API_KEY');
      } else if (apiKey === validPmApiKey) {
        // PM-level access
        session = { id: 0, role: 'PM' };
        isApiKeyAuth = true;
        console.log('📊 [KPI] Authenticated via PM_API_KEY');
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid API key' },
          { status: 401 }
        );
      }
    } else {
      // Try SSO token authentication (username + sso token in body or headers)
      const ssoUsername = request.headers.get('x-sso-username');
      const ssoToken = request.headers.get('x-sso-token');

      if (ssoUsername && ssoToken) {
        // SSO Token authentication - verify against pegawai.ssoUserId
        const ssoUser = await prisma.pegawai.findFirst({
          where: {
            username: ssoUsername,
            ssoUserId: ssoToken
          },
          select: { id: true, role: true, namaLengkap: true }
        });

        if (ssoUser) {
          session = { id: ssoUser.id, role: ssoUser.role };
          isApiKeyAuth = false;
          console.log(`📊 [KPI] Authenticated via SSO token: ${ssoUsername} (ID: ${ssoUser.id}, Role: ${ssoUser.role})`);
        } else {
          return NextResponse.json(
            { success: false, message: 'Invalid SSO credentials (username + token mismatch)' },
            { status: 401 }
          );
        }
      } else {
        // Session cookie authentication (for web dashboard)
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');
        
        if (!sessionCookie) {
          return NextResponse.json(
            { success: false, message: 'Not authenticated. Provide session cookie, X-API-KEY, or X-SSO-USERNAME + X-SSO-TOKEN headers.' },
            { status: 401 }
          );
        }

        session = verifySession(sessionCookie.value);

        if (!session) {
          return NextResponse.json(
            { success: false, message: 'Invalid or expired session' },
            { status: 401 }
          );
        }
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const pegawaiIdParam = searchParams.get('pegawaiId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startTimeParam = searchParams.get('startTime') || '00:00';
    const endTimeParam = searchParams.get('endTime') || '23:59';

    // Determine which programmer to calculate
    let pegawaiId: number;
    
    if (pegawaiIdParam) {
      pegawaiId = parseInt(pegawaiIdParam);
      
      if (isNaN(pegawaiId)) {
        return NextResponse.json(
          { success: false, message: 'pegawaiId must be a valid number' },
          { status: 400 }
        );
      }
      
      // Authorization check (only for session auth, API key has full access)
      if (!isApiKeyAuth && session.role === 'PROGRAMMER' && session.id !== pegawaiId) {
        return NextResponse.json(
          { success: false, message: 'You can only view your own KPI' },
          { status: 403 }
        );
      }
    } else if (isApiKeyAuth) {
      // API Key auth requires pegawaiId (karena tidak tahu user mana)
      return NextResponse.json(
        { success: false, message: 'pegawaiId is required when using API Key authentication' },
        { status: 400 }
      );
    } else {
      // SSO auth atau Session auth: otomatis pakai user yang login
      pegawaiId = session.id;
      
      if (!pegawaiId || pegawaiId <= 0) {
        return NextResponse.json(
          { success: false, message: 'Cannot determine user. Provide pegawaiId or use SSO/session auth.' },
          { status: 400 }
        );
      }
    }

    // Get programmer info
    const programmer = await prisma.pegawai.findUnique({
      where: { id: pegawaiId },
      select: { id: true, namaLengkap: true, username: true }
    });

    if (!programmer) {
      return NextResponse.json(
        { success: false, message: 'Programmer not found' },
        { status: 404 }
      );
    }

    // Calculate date range
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(`${startDateParam}T${startTimeParam}:00`);
      endDate = new Date(`${endDateParam}T${endTimeParam}:59`);
    } else {
      // Default: awal bulan ini sampai hari ini
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      startDate.setDate(1); // Tanggal 1 bulan ini
      startDate.setHours(0, 0, 0, 0);
    }

    // Fetch tasklists in the period using Prisma directly with same filter logic as KPI monitoring
    // Filter by scheduleAt OR updatedAt to catch all relevant tasks
    let tasklists;
    
    if (!isApiKeyAuth && session.role === 'PROGRAMMER') {
      // PROGRAMMER (session auth): only see own tasks
      const where: any = {
        pegawaiId: session.id
      };
      
      // Add date filter - include tasks that were scheduled, updated, OR created in the period
      // This ensures we capture all relevant tasks for the KPI period
      if (startDateParam && endDateParam) {
        where.OR = [
          {
            scheduleAt: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            updatedAt: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        ];
      }
      
      tasklists = await prisma.tasklist.findMany({
        where,
        orderBy: { scheduleAt: 'desc' }
      });
      
      console.log(`📊 [KPI] PROGRAMMER ${session.id}: Found ${tasklists.length} tasklists`);
      console.log(`📊 [KPI] Date filter: ${startDateParam} to ${endDateParam}`);
      console.log(`📊 [KPI] Sample task IDs:`, tasklists.slice(0, 5).map((t: any) => t.id));
    } else {
      // PM/SUPER_ADMIN: can specify pegawaiId or see all
      const where: any = {
        pegawaiId: pegawaiId
      };
      
      // Add date filter - include tasks that were scheduled, updated, OR created in the period
      if (startDateParam && endDateParam) {
        where.OR = [
          {
            scheduleAt: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            updatedAt: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          }
        ];
      }
      
      tasklists = await prisma.tasklist.findMany({
        where,
        orderBy: { scheduleAt: 'desc' }
      });
      
      console.log(`📊 [KPI] ${session.role} viewing user ${pegawaiId}: Found ${tasklists.length} tasklists`);
    }

    // Fetch task logs for history
    const taskIds = tasklists.map((t: any) => t.id);
    const taskLogs = await prisma.tasklistLog.findMany({
      where: {
        taskId: { in: taskIds }
      },
      orderBy: { waktu: 'desc' }
    });

    console.log(`📊 [KPI] Fetched ${taskLogs.length} logs for ${taskIds.length} tasks`);
    
    // Log sample of logs with STATUS_CHANGE action
    const statusChangeLogs = taskLogs.filter(log => log.action === 'STATUS_CHANGE');
    console.log(`📊 [KPI] Found ${statusChangeLogs.length} STATUS_CHANGE logs`);
    if (statusChangeLogs.length > 0) {
      console.log(`📊 [KPI] Sample STATUS_CHANGE logs:`, statusChangeLogs.slice(0, 3).map(log => ({
        taskId: log.taskId,
        action: log.action,
        keterangan: log.keterangan,
        status: log.status
      })));
    }

    // Group logs by taskId
    const logsByTaskId = new Map<number, typeof taskLogs>();
    for (const log of taskLogs) {
      if (!logsByTaskId.has(log.taskId)) {
        logsByTaskId.set(log.taskId, []);
      }
      logsByTaskId.get(log.taskId)!.push(log);
    }

    // Calculate metrics
    const totalTasklist = tasklists.length;
    
    console.log('=== KPI Calculation Debug ===');
    console.log('Total tasklists:', totalTasklist);
    console.log('Date range:', { startDate, endDate });
    
    // 1. Task Selesai - Percentage (0-100%)
    // TS = (Total Selesai / Total Task) × 100%
    const totalTasklistSelesai = tasklists.filter((t: any) => t.status === 'SELESAI').length;
    const taskSelesaiPercentage = totalTasklist > 0 ? (totalTasklistSelesai / totalTasklist) * 100 : 0;
    
    console.log('Task Selesai:', { totalTasklistSelesai, taskSelesaiPercentage });

    // 2. Task Tepat Waktu - Percentage (0-100%)
    // TTW = (Total Tepat Waktu / Total Task) × 100%
    // Tepat waktu = task selesai sebelum atau pada calculatedDueDate
    let totalTasklistTepatWaktu = 0;
    
    for (const task of tasklists) {
      if (task.status === 'SELESAI' && task.calculatedDueDate) {
        // Find when task was completed (last SELESAI log or updatedAt)
        const taskLogsForTask = logsByTaskId.get(task.id) || [];
        
        // Find the log when task was marked as SELESAI or MENUNGGU_REVIEW_PM
        const completionLog = taskLogsForTask.find(
          (log) => log.status === 'SELESAI' || log.status === 'MENUNGGU_REVIEW_PM'
        );
        
        const completionTime = completionLog ? new Date(completionLog.waktu) : new Date(task.updatedAt);
        const dueDate = new Date(task.calculatedDueDate);
        
        // Task is on-time if completed before or on due date
        if (completionTime <= dueDate) {
          totalTasklistTepatWaktu++;
        }
      }
    }
    
    const taskTepatWaktuPercentage = totalTasklist > 0 ? (totalTasklistTepatWaktu / totalTasklist) * 100 : 0;
    
    console.log('Task Tepat Waktu:', { totalTasklistTepatWaktu, taskTepatWaktuPercentage });

    // 3. Waktu Pengerjaan - Percentage (0-100%)
    // WP = (Total Jam Jadwal / Total Jam Absen) × 100%
    // Jika 100% = sempurna (selesai tepat waktu)
    // Jika < 100% = lebih cepat (bagus!)
    // Jika > 100% = lebih lama (kurang bagus)
    // Using totalDurationMinutes from tasklist (actual work time tracked)
    
    // Calculate total scheduled hours from totalDurationMinutes
    const totalJamJadwal = tasklists.reduce((sum: number, t: any) => {
      if (t.totalDurationMinutes && t.totalDurationMinutes > 0) {
        return sum + (t.totalDurationMinutes / 60);
      }
      return sum;
    }, 0);

    // Calculate total attendance hours from Jadwal API (range endpoint)
    // Format date range for API call
    const startYear = startDate.getFullYear();
    const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const startDay = startDate.getDate().toString().padStart(2, '0');
    const endYear = endDate.getFullYear();
    const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
    const endDay = endDate.getDate().toString().padStart(2, '0');
    const tanggalAwal = `${startYear}-${startMonth}-${startDay}`;
    const tanggalAkhir = `${endYear}-${endMonth}-${endDay}`;

    // Fetch attendance data from Jadwal API using range endpoint (single call)
    const { getJadwalByRange } = await import('@/lib/richzspotService');

    let totalJamAbsen = 0;
    
    try {
      console.log(`📊 [KPI] Fetching attendance data for user ${pegawaiId} (${tanggalAwal} - ${tanggalAkhir})`);
      
      // Get ssoUserId from pegawai to use as identifier (no auth needed)
      const { PrismaClient: PrismaClientKPI } = require('@prisma/client');
      const prismaKPI = new PrismaClientKPI();
      const pegawaiForJadwal = await prismaKPI.pegawai.findUnique({
        where: { id: pegawaiId },
        select: { ssoUserId: true }
      });
      await prismaKPI.$disconnect();

      if (!pegawaiForJadwal?.ssoUserId) {
        console.warn(`⚠️ [KPI] Pegawai ${pegawaiId} has no ssoUserId - skipping attendance data`);
      } else {
        const jadwalData = await getJadwalByRange(tanggalAwal, tanggalAkhir, { ssoUserId: pegawaiForJadwal.ssoUserId });
        
        for (const attendance of jadwalData) {
          // Check if it's a working day (has shift times)
          if (attendance.shift_jam_masuk && attendance.shift_jam_pulang) {
            // Use durasi_jam if available, otherwise calculate from shift times
            if (attendance.durasi_jam) {
              totalJamAbsen += parseFloat(String(attendance.durasi_jam));
              console.log(`   ${attendance.tanggal || 'unknown'}: ${attendance.durasi_jam} hours (from durasi_jam)`);
            } else {
              // Calculate from shift times
              const [startH, startM] = attendance.shift_jam_masuk.split(':').map(Number);
              const [endH, endM] = attendance.shift_jam_pulang.split(':').map(Number);
              const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
              totalJamAbsen += hours;
              console.log(`   ${attendance.tanggal || 'unknown'}: ${hours.toFixed(2)} hours (calculated)`);
            }
          } else {
            console.log(`   ${attendance.tanggal || 'unknown'}: Holiday/No shift`);
          }
        }
      }
      
      console.log(`📊 [KPI] Total attendance hours: ${totalJamAbsen.toFixed(2)}`);
    } catch (err) {
      console.warn(`⚠️ [KPI] Failed to fetch attendance data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Calculate percentage
    // Formula: WP = (Total Jam Jadwal / Total Jam Absen) × 100%
    // 100% = perfect (finished exactly on time)
    // < 100% = faster (good!)
    // > 100% = slower (not good)
    // For KPI: invert so 100% is best
    let waktuPengerjaanPercentage = 0;
    
    if (totalJamAbsen > 0 && totalJamJadwal > 0) {
      // Calculate efficiency: lower is better
      const efficiency = (totalJamJadwal / totalJamAbsen) * 100;
      // Invert: if efficiency is 50% (very fast), KPI should be 100%
      // if efficiency is 100% (on time), KPI should be 100%
      // if efficiency is 200% (slow), KPI should be 50%
      // Formula: KPI = 100 if efficiency <= 100, else (100 / efficiency) * 100
      if (efficiency <= 100) {
        waktuPengerjaanPercentage = 100; // Perfect or better
      } else {
        waktuPengerjaanPercentage = (100 / efficiency) * 100; // Penalized for being slow
      }
    } else if (totalJamAbsen === 0 && totalJamJadwal > 0) {
      // No attendance data but has work hours tracked
      // This means programmer worked but attendance system didn't record
      // Give 50% as neutral score (not perfect, not terrible)
      waktuPengerjaanPercentage = 50;
      console.log(`⚠️ [KPI] No attendance data but has ${totalJamJadwal.toFixed(2)} work hours - giving 50% neutral score`);
    } else if (totalJamAbsen > 0 && totalJamJadwal === 0) {
      // Has attendance but no work tracked
      // This is bad - attended but didn't work
      waktuPengerjaanPercentage = 0;
      console.log(`⚠️ [KPI] Has attendance but no work tracked - giving 0%`);
    }
    // else: both are 0, keep waktuPengerjaanPercentage = 0
    
    console.log('Waktu Pengerjaan:', { 
      totalJamJadwal: totalJamJadwal.toFixed(2), 
      totalJamAbsen: totalJamAbsen.toFixed(2), 
      waktuPengerjaanPercentage: waktuPengerjaanPercentage.toFixed(2)
    });

    // 4. Task Revisi - Percentage (0-100%)
    // TR = (Total Aksi Revisi / Total Tasklist) × 100%
    // KPI = 100% - TR% (no revision = 100%, full revision = 0%)
    // Revisi = task yang pernah di-reject (ada log dengan action='STATUS_CHANGE' dan keterangan contains 'reject')
    let totalAksiRevisi = 0;
    let tasksWithRevision = 0;
    
    console.log('📊 [KPI] Checking revisions for', tasklists.length, 'tasks');
    
    for (const task of tasklists) {
      const taskLogsForTask = logsByTaskId.get(task.id) || [];
      
      // Count rejection logs (STATUS_CHANGE with 'reject' in keterangan)
      const revisionLogs = taskLogsForTask.filter(
        (log) => log.action === 'STATUS_CHANGE' && 
                 log.keterangan && 
                 log.keterangan.toLowerCase().includes('reject')
      );
      
      const revisiCount = revisionLogs.length;
      
      if (revisiCount > 0) {
        totalAksiRevisi += revisiCount;
        tasksWithRevision++;
        console.log(`   Task ${task.id}: ${revisiCount} rejection(s)`);
      }
    }
    
    console.log(`📊 [KPI] Total revisions: ${totalAksiRevisi} across ${tasksWithRevision} tasks`);
    
    const taskRevisiRawPercentage = totalTasklist > 0 ? (totalAksiRevisi / totalTasklist) * 100 : 0;
    // Invert: no revision = 100%, full revision = 0%
    const taskRevisiPercentage = Math.max(0, 100 - taskRevisiRawPercentage);
    
    console.log('Task Revisi:', { totalAksiRevisi, taskRevisiRawPercentage, taskRevisiPercentage });

    // Total KPI = Weighted sum of 4 indicators
    // Each indicator is 0-100%, then multiplied by its weight
    // Weights: Task Selesai (30%), Task Tepat Waktu (40%), Waktu Pengerjaan (20%), Task Revisi (10%)
    const taskSelesaiContribution = (taskSelesaiPercentage * 0.3);
    const taskTepatWaktuContribution = (taskTepatWaktuPercentage * 0.4);
    const waktuPengerjaanContribution = (waktuPengerjaanPercentage * 0.2);
    const taskRevisiContribution = (taskRevisiPercentage * 0.1);
    
    const totalScore = taskSelesaiContribution + taskTepatWaktuContribution + waktuPengerjaanContribution + taskRevisiContribution;
    
    console.log('Contributions:', {
      taskSelesai: taskSelesaiContribution.toFixed(2),
      taskTepatWaktu: taskTepatWaktuContribution.toFixed(2),
      waktuPengerjaan: waktuPengerjaanContribution.toFixed(2),
      taskRevisi: taskRevisiContribution.toFixed(2)
    });
    console.log('Total KPI (Weighted):', totalScore.toFixed(2));
    console.log('=== End KPI Calculation ===');

    return NextResponse.json({
      success: true,
      data: {
        programmer: {
          id: programmer.id,
          name: programmer.namaLengkap,
          username: programmer.username
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startTime: startTimeParam,
          endTime: endTimeParam
        },
        kpi: {
          taskSelesai: {
            percentage: Math.round(taskSelesaiPercentage * 100) / 100,
            contribution: Math.round(taskSelesaiContribution * 100) / 100,
            weight: 30
          },
          taskTepatWaktu: {
            percentage: Math.round(taskTepatWaktuPercentage * 100) / 100,
            contribution: Math.round(taskTepatWaktuContribution * 100) / 100,
            weight: 40
          },
          waktuPengerjaan: {
            percentage: Math.round(waktuPengerjaanPercentage * 100) / 100,
            contribution: Math.round(waktuPengerjaanContribution * 100) / 100,
            weight: 20
          },
          taskRevisi: {
            percentage: Math.round(taskRevisiPercentage * 100) / 100,
            contribution: Math.round(taskRevisiContribution * 100) / 100,
            weight: 10
          },
          totalPercentage: Math.round(totalScore * 100) / 100
        },
        metrics: {
          totalTasklist,
          totalTasklistSelesai,
          totalTasklistTepatWaktu,
          totalTasklistRevisi: totalAksiRevisi,
          totalJamJadwal: Math.round(totalJamJadwal * 100) / 100,
          totalJamAbsen: Math.round(totalJamAbsen * 100) / 100
        }
      }
    });

  } catch (error) {
    console.error('Error calculating KPI:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userFriendlyMessage = 'Gagal menghitung KPI';
    let hint = '';
    
    if (errorMessage.includes('pegawai')) {
      userFriendlyMessage = 'Programmer tidak ditemukan di database';
      hint = 'Pastikan pegawaiId valid atau SSO credentials benar';
    } else if (errorMessage.includes('ssoUserId') || errorMessage.includes('SSO')) {
      userFriendlyMessage = 'User belum terhubung dengan sistem SSO (ssoUserId kosong)';
      hint = 'Hubungi admin untuk linking akun SSO';
    } else if (errorMessage.includes('Jadwal') || errorMessage.includes('RichzSpot')) {
      userFriendlyMessage = 'Gagal mengambil data jadwal dari RichzSpot API';
      hint = 'Pastikan server RichzSpot JWT aktif dan user memiliki jadwal';
    } else if (errorMessage.includes('prisma') || errorMessage.includes('Prisma')) {
      userFriendlyMessage = 'Gagal mengakses database';
      hint = 'Periksa koneksi database';
    } else if (errorMessage.includes('authenticated') || errorMessage.includes('session')) {
      userFriendlyMessage = 'Sesi tidak valid atau sudah expired';
      hint = 'Login ulang atau periksa SSO token';
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: userFriendlyMessage,
        hint,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
