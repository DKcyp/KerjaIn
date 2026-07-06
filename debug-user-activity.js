/**
 * Debug script untuk memeriksa data aktivitas user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUserActivity() {
  const userId = 6;
  const dateStr = '2025-03-28';
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Debug User Activity Data                             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nUser ID: ${userId}`);
  console.log(`Date: ${dateStr}\n`);

  try {
    // 1. Check user exists
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
      console.log('❌ User tidak ditemukan!');
      return;
    }

    console.log('✅ User ditemukan:');
    console.log(`   Nama: ${user.namaLengkap}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   No Urut: ${user.noUrut}\n`);

    // 2. Parse date range
    const [year, month, day] = dateStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);

    console.log('📅 Date Range:');
    console.log(`   Start: ${startDate.toISOString()}`);
    console.log(`   End: ${endDate.toISOString()}\n`);

    // 3. Check TasklistLog
    console.log('🔍 Checking TasklistLog...');
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

    console.log(`   Found ${taskLogs.length} log entries\n`);

    if (taskLogs.length > 0) {
      console.log('📋 TasklistLog entries:');
      taskLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. Task ID: ${log.taskId}`);
        console.log(`      Time: ${log.waktu.toISOString()}`);
        console.log(`      Action: ${log.action}`);
        console.log(`      Status: ${log.status || 'N/A'}`);
        console.log(`      Keterangan: ${log.keterangan || 'N/A'}`);
        console.log('');
      });
    }

    // 4. Check TaskActivity
    console.log('🔍 Checking TaskActivity...');
    
    // Get all tasks for this user
    const userTasks = await prisma.tasklist.findMany({
      where: {
        pegawaiId: userId
      },
      select: {
        id: true
      }
    });

    const taskIds = userTasks.map(t => t.id);
    console.log(`   User has ${taskIds.length} tasks total\n`);

    if (taskIds.length > 0) {
      const taskActivities = await prisma.taskActivity.findMany({
        where: {
          taskId: { in: taskIds },
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log(`   Found ${taskActivities.length} activity entries\n`);

      if (taskActivities.length > 0) {
        console.log('📋 TaskActivity entries:');
        taskActivities.forEach((activity, index) => {
          console.log(`   ${index + 1}. Task ID: ${activity.taskId}`);
          console.log(`      Time: ${activity.createdAt.toISOString()}`);
          console.log(`      Action: ${activity.action}`);
          console.log(`      User ID: ${activity.userId}`);
          console.log(`      From Status: ${activity.fromStatus || 'N/A'}`);
          console.log(`      To Status: ${activity.toStatus || 'N/A'}`);
          console.log(`      Note: ${activity.note || 'N/A'}`);
          console.log('');
        });
      }
    }

    // 5. Check tasks created/updated on that date
    console.log('🔍 Checking Tasklist created/updated on this date...');
    const tasksOnDate = await prisma.tasklist.findMany({
      where: {
        OR: [
          {
            pegawaiId: userId,
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            pegawaiId: userId,
            updatedAt: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            pegawaiId: userId,
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
      }
    });

    console.log(`   Found ${tasksOnDate.length} tasks\n`);

    if (tasksOnDate.length > 0) {
      console.log('📋 Tasks on this date:');
      for (const task of tasksOnDate) {
        const project = await prisma.proyek.findUnique({
          where: { id: task.module.projectId },
          select: { namaProyek: true }
        });

        console.log(`   Task ID: ${task.id}`);
        console.log(`   Code: ${task.kode}`);
        console.log(`   Project: ${project?.namaProyek || 'Unknown'}`);
        console.log(`   Module: ${task.module.nama}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Created: ${task.createdAt.toISOString()}`);
        console.log(`   Updated: ${task.updatedAt.toISOString()}`);
        console.log(`   Schedule: ${task.scheduleAt.toISOString()}`);
        console.log('');
      }
    }

    // 6. Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY:');
    console.log(`   TasklistLog entries: ${taskLogs.length}`);
    console.log(`   TaskActivity entries: ${taskActivities ? taskActivities.length : 0}`);
    console.log(`   Tasks on date: ${tasksOnDate.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (taskLogs.length === 0 && tasksOnDate.length === 0) {
      console.log('⚠️  ISSUE: Tidak ada data aktivitas ditemukan!');
      console.log('   Kemungkinan penyebab:');
      console.log('   1. Data log tidak tersimpan di TasklistLog');
      console.log('   2. Timezone issue (waktu tersimpan dalam timezone berbeda)');
      console.log('   3. User ID atau tanggal salah');
      console.log('   4. Data ada di tabel lain yang belum dicek\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserActivity();
