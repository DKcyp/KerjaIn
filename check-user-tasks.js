/**
 * Check tasks assigned to user on specific date
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserTasks() {
  const userId = 6;
  const dateStr = '2025-03-28';
  
  console.log('Checking tasks for User ID:', userId);
  console.log('Date:', dateStr);
  console.log('');

  try {
    // Check all tasks assigned to this user
    const allTasks = await prisma.tasklist.findMany({
      where: {
        pegawaiId: userId
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
        updatedAt: 'desc'
      },
      take: 20 // Last 20 tasks
    });

    console.log(`Total tasks assigned to user: ${allTasks.length}\n`);

    if (allTasks.length > 0) {
      console.log('Recent tasks:');
      for (const task of allTasks) {
        const project = await prisma.proyek.findUnique({
          where: { id: task.module.projectId },
          select: { namaProyek: true }
        });

        console.log(`\nTask ID: ${task.id}`);
        console.log(`  Code: ${task.kode}`);
        console.log(`  Project: ${project?.namaProyek || 'Unknown'}`);
        console.log(`  Module: ${task.module.nama}`);
        console.log(`  Status: ${task.status}`);
        console.log(`  Created: ${task.createdAt.toLocaleString('id-ID')}`);
        console.log(`  Updated: ${task.updatedAt.toLocaleString('id-ID')}`);
        console.log(`  Schedule: ${task.scheduleAt.toLocaleString('id-ID')}`);
        
        // Check if updated on target date
        const taskDate = task.updatedAt.toISOString().split('T')[0];
        if (taskDate === dateStr) {
          console.log('  ✅ UPDATED ON TARGET DATE!');
        }
      }
    }

    // Check TasklistLog for this user (any date)
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Checking TasklistLog for this user (last 20 entries)...\n');
    
    const logs = await prisma.tasklistLog.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        waktu: 'desc'
      },
      take: 20
    });

    console.log(`Total log entries for user: ${logs.length}\n`);

    if (logs.length > 0) {
      logs.forEach((log, index) => {
        console.log(`${index + 1}. Task ID: ${log.taskId}`);
        console.log(`   Time: ${log.waktu.toLocaleString('id-ID')}`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Status: ${log.status || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  NO LOG ENTRIES FOUND!');
      console.log('   This means activities are not being logged to TasklistLog table.');
      console.log('   The API relies on TasklistLog for activity tracking.\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserTasks();
