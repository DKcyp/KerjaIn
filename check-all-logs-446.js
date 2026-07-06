const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllLogs446() {
  try {
    console.log('🔍 Checking ALL logs for task 446...\n');

    // Get all logs for this task
    const allLogs = await prisma.tasklistLog.findMany({
      where: { taskId: 446 },
      select: {
        id: true,
        taskId: true,
        waktu: true,
        action: true,
        status: true,
        keterangan: true,
        userId: true,
      },
      orderBy: { waktu: 'asc' }
    });

    console.log(`📝 Found ${allLogs.length} logs for task 446:`);
    
    if (allLogs.length === 0) {
      console.log('   No logs found at all!');
      
      // Check if task exists and its current status
      const task = await prisma.tasklist.findUnique({
        where: { id: 446 },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          createdAt: true,
        }
      });
      
      console.log('\n📋 Task status:');
      console.log('   Current Status:', task?.status);
      console.log('   Created At:', task?.createdAt);
      console.log('   Updated At:', task?.updatedAt);
      
    } else {
      allLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.waktu} - ${log.action} -> ${log.status || 'null'}`);
        if (log.keterangan) {
          console.log(`      Keterangan: ${log.keterangan}`);
        }
      });
    }

    // Check if there are any logs with SELESAI status for any task (to verify the query works)
    const selesaiLogs = await prisma.tasklistLog.findMany({
      where: {
        action: 'STATUS_CHANGE',
        status: 'SELESAI'
      },
      select: {
        taskId: true,
        waktu: true,
      },
      take: 5
    });

    console.log(`\n🔍 Sample SELESAI logs from other tasks (${selesaiLogs.length} found):`);
    selesaiLogs.forEach(log => {
      console.log(`   Task ${log.taskId}: ${log.waktu}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllLogs446();