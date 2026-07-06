import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSessionFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/user-activity/daily
 * 
 * Mendapatkan ringkasan aktivitas user pada hari tertentu
 * 
 * Authentication:
 * - Cookie: session=<token>
 * - Header: x-api-key: <token>
 * - Header: Authorization: Bearer <token>
 * - Header: x-mobile-token: <token>
 * 
 * Query Parameters:
 * - userId: ID user (required)
 * - date: Tanggal dalam format YYYY-MM-DD (required)
 * 
 * Response:
 * - summary: Ringkasan aktivitas dalam format teks yang rapi
 * - activities: Array detail aktivitas
 */
export async function GET(req: NextRequest) {
  try {
    // Parse session dari berbagai metode autentikasi (Cookie, x-api-key, Bearer, dll)
    let session = parseSessionFromRequest(req);

    // Fallback: Check for hardcoded API key (untuk development/testing)
    if (!session) {
      const apiKey = req.headers.get('x-api-key');
      const hardcodedKey = '172dc4710ab54af8b1b405c89d6de9f0';
      
      if (apiKey === hardcodedKey) {
        console.log('✅ Using hardcoded API key for authentication');
        // Create a mock session for the hardcoded key
        // You can customize this based on your needs
        session = {
          id: 4, // Default user ID, bisa diambil dari query param juga
          role: 'PROGRAMMER',
          namaLengkap: 'API User',
          username: 'apiuser'
        };
      }
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Session tidak valid' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const dateParam = searchParams.get('date');

    // Validasi parameters
    if (!userIdParam || !dateParam) {
      return NextResponse.json(
        { error: 'Parameter userId dan date wajib diisi' },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'userId harus berupa angka' },
        { status: 400 }
      );
    }

    // Validasi format tanggal
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: 'Format tanggal harus YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Authorization check: user hanya bisa melihat aktivitas sendiri kecuali ADMIN/PM
    // if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN' && session.role !== 'PM' && session.id !== userId) {
    //   return NextResponse.json(
    //     { error: 'Anda tidak memiliki akses untuk melihat aktivitas user ini' },
    //     { status: 403 }
    //   );
    // }

    // Parse tanggal untuk mendapatkan range hari tersebut
    const [year, month, day] = dateParam.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Ambil data user
    const user = await prisma.pegawai.findUnique({
      where: { id: userId },
      select: {
        id: true,
        namaLengkap: true,
        noUrut: true,
        role: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Ambil semua log aktivitas pada hari tersebut
    const taskLogs = await prisma.tasklistLog.findMany({
      where: {
        userId: userId,
        waktu: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        waktu: 'asc'
      }
    });

    // Fallback: Jika tidak ada log, ambil dari Tasklist yang updated/created pada hari itu
    let tasks: any[] = [];
    let taskIds: number[] = [];

    if (taskLogs.length === 0) {
      console.log('⚠️  No TasklistLog found, falling back to Tasklist data');
      
      // Ambil tasks yang di-update atau di-create pada hari tersebut
      tasks = await prisma.tasklist.findMany({
        where: {
          pegawaiId: userId,
          OR: [
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
            },
            {
              scheduleAt: {
                gte: startDate,
                lte: endDate
              }
            }
          ]
        },
        include: {
          module: {
            select: {
              nama: true,
              projectId: true
            }
          }
        },
        orderBy: {
          updatedAt: 'asc'
        }
      });

      taskIds = tasks.map(t => t.id);
    } else {
      // Ambil task IDs yang unik dari logs
      taskIds = Array.from(new Set(taskLogs.map(log => log.taskId)));

      // Ambil detail tasks
      tasks = await prisma.tasklist.findMany({
        where: {
          id: { in: taskIds }
        },
        include: {
          module: {
            select: {
              nama: true,
              projectId: true
            }
          }
        }
      });
    }

    // Ambil nama project
    const projectIds = Array.from(new Set(tasks.map(t => t.module.projectId)));
    const projects = await prisma.proyek.findMany({
      where: {
        id: { in: projectIds }
      },
      select: {
        id: true,
        namaProyek: true
      }
    });

    // Buat map untuk lookup cepat
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Kelompokkan aktivitas berdasarkan task
    const taskActivities = new Map<number, typeof taskLogs>();
    
    if (taskLogs.length > 0) {
      // Jika ada logs, kelompokkan berdasarkan task
      for (const log of taskLogs) {
        if (!taskActivities.has(log.taskId)) {
          taskActivities.set(log.taskId, []);
        }
        taskActivities.get(log.taskId)!.push(log);
      }
    } else {
      // Jika tidak ada logs, buat entry dari task langsung
      for (const task of tasks) {
        taskActivities.set(task.id, []);
      }
    }

    // Format aktivitas untuk response
    const activities = Array.from(taskActivities.entries()).map(([taskId, logs]) => {
      const task = taskMap.get(taskId);
      if (!task) return null;

      const project = projectMap.get(task.module.projectId);
      
      // Hitung total durasi kerja (dari start/stop atau totalDurationMinutes)
      let totalMinutes = 0;
      if (logs.length > 0) {
        for (const log of logs) {
          if (log.totalStartStopMinutes) {
            totalMinutes += log.totalStartStopMinutes;
          }
        }
      } else {
        // Fallback ke totalDurationMinutes dari task
        totalMinutes = task.totalDurationMinutes || 0;
      }

      // Ambil status terakhir
      const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
      
      // Buat aktivitas dari task info jika tidak ada logs
      const taskActivitiesList = logs.length > 0 
        ? logs.map(log => ({
            time: log.waktu,
            action: log.action,
            keterangan: log.keterangan,
            status: log.status
          }))
        : [
            {
              time: task.createdAt,
              action: 'CREATED',
              keterangan: 'Task dibuat',
              status: 'MENUNGGU_PROSES_USER'
            },
            ...(task.startedAt ? [{
              time: task.startedAt,
              action: 'START',
              keterangan: 'Mulai mengerjakan',
              status: 'SEDANG_DIPROSES_USER'
            }] : []),
            {
              time: task.updatedAt,
              action: 'UPDATE',
              keterangan: 'Task diupdate',
              status: task.status
            }
          ];
      
      return {
        taskId: task.id,
        taskCode: task.kode,
        projectName: project?.namaProyek || 'Unknown',
        moduleName: task.module.nama,
        keterangan: task.keterangan || '',
        status: lastLog?.status || task.status,
        totalDurationMinutes: totalMinutes,
        activityCount: taskActivitiesList.length,
        activities: taskActivitiesList
      };
    }).filter(Boolean);

    // Generate summary text
    const summary = generateSummary(user, dateParam, activities);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          nama: user.namaLengkap,
          noUrut: user.noUrut,
          role: user.role
        },
        date: dateParam,
        summary,
        activities,
        statistics: {
          totalTasks: activities.length,
          totalActivities: taskLogs.length,
          totalWorkMinutes: activities.reduce((sum, act) => sum + (act?.totalDurationMinutes || 0), 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user daily activity:', error);
    return NextResponse.json(
      { 
        error: 'Terjadi kesalahan saat mengambil data aktivitas',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Generate summary text dari aktivitas
 */
function generateSummary(
  user: { namaLengkap: string; role: string },
  date: string,
  activities: any[]
): string {
  const lines: string[] = [];
  
  lines.push(`📊 RINGKASAN AKTIVITAS HARIAN`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`👤 User: ${user.namaLengkap} (${user.role})`);
  lines.push(`📅 Tanggal: ${formatDate(date)}`);
  lines.push(``);

  if (activities.length === 0) {
    lines.push(`ℹ️  Tidak ada aktivitas pada hari ini`);
    return lines.join('\n');
  }

  // Statistik umum
  const totalTasks = activities.length;
  const totalMinutes = activities.reduce((sum, act) => sum + (act?.totalDurationMinutes || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  lines.push(`📈 STATISTIK:`);
  lines.push(`   • Total Task Dikerjakan: ${totalTasks} task`);
  lines.push(`   • Total Waktu Kerja: ${hours} jam ${minutes} menit`);
  lines.push(``);

  // Detail per task
  lines.push(`📋 DETAIL AKTIVITAS:`);
  lines.push(``);

  activities.forEach((activity, index) => {
    if (!activity) return;
    
    const taskHours = Math.floor(activity.totalDurationMinutes / 60);
    const taskMinutes = activity.totalDurationMinutes % 60;
    
    lines.push(`${index + 1}. ${activity.taskCode} - ${activity.projectName}`);
    lines.push(`   📦 Module: ${activity.moduleName}`);
    if (activity.keterangan) {
      lines.push(`   📝 Keterangan: ${activity.keterangan}`);
    }
    lines.push(`   ⏱️  Durasi: ${taskHours}j ${taskMinutes}m`);
    lines.push(`   📊 Status: ${formatStatus(activity.status)}`);
    lines.push(`   🔄 Jumlah Aktivitas: ${activity.activityCount}x`);
    
    // Tampilkan beberapa aktivitas terakhir
    const recentActivities = activity.activities.slice(-3);
    if (recentActivities.length > 0) {
      lines.push(`   📌 Aktivitas Terakhir:`);
      recentActivities.forEach((act: any) => {
        const time = new Date(act.time).toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        lines.push(`      • ${time} - ${act.action}${act.keterangan ? ': ' + act.keterangan : ''}`);
      });
    }
    
    lines.push(``);
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✅ Ringkasan berhasil dibuat`);

  return lines.join('\n');
}

/**
 * Format tanggal ke bahasa Indonesia
 */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Format status ke teks yang lebih readable
 */
function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'MENUNGGU_PROSES_USER': '⏳ Menunggu Proses',
    'SEDANG_DIPROSES_USER': '🔄 Sedang Diproses',
    'SEDANG_DIPROSES_USER_PAUSED': '⏸️  Sedang Diproses (Paused)',
    'MENUNGGU_REVIEW_PM': '👀 Menunggu Review PM',
    'SELESAI': '✅ Selesai'
  };
  
  return statusMap[status] || status;
}
