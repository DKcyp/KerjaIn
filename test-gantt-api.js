const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testGanttAPI() {
  try {
    console.log('🔍 Testing gantt-chart-project API data...\n');

    // Check completed tasks
    const completedTasks = await prisma.tasklist.findMany({
      where: { status: 'SELESAI' },
      select: {
        id: true,
        kode: true,
        status: true,
        pegawaiId: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 3
    });

    // Get pegawai names for completed tasks
    const pegawaiIds = completedTasks.map(t => t.pegawaiId);
    const pegawais = await prisma.pegawai.findMany({
      where: { id: { in: pegawaiIds } },
      select: { id: true, namaLengkap: true }
    });
    const pegawaiMap = new Map(pegawais.map(p => [p.id, p.namaLengkap]));

    console.log('✅ Sample completed tasks:');
    completedTasks.forEach(task => {
      const pegawaiNama = pegawaiMap.get(task.pegawaiId) || 'Unknown';
      console.log(`   ${task.kode} - ${pegawaiNama} (ID: ${task.id})`);
    });

    // Check logs for one completed task
    if (completedTasks.length > 0) {
      const taskId = completedTasks[0].id;
      console.log(`\n🔍 Checking logs for task ${completedTasks[0].kode} (ID: ${taskId}):`);
      
      // Check all logs first
      const allLogs = await prisma.tasklistLog.findMany({
        where: { taskId: taskId },
        select: {
          waktu: true,
          action: true,
          status: true,
        },
        orderBy: { waktu: 'desc' },
        take: 10
      });

      console.log('   📝 All recent logs:');
      allLogs.forEach(log => {
        console.log(`      ${log.waktu} - ${log.action} -> ${log.status || 'null'}`);
      });
      
      const logs = await prisma.tasklistLog.findMany({
        where: {
          taskId: taskId,
          OR: [
            { action: 'STATUS_CHANGE', status: 'MENUNGGU_REVIEW_PM' },
            { action: 'STATUS_CHANGE', status: 'SELESAI' }
          ]
        },
        select: {
          waktu: true,
          action: true,
          status: true,
        },
        orderBy: { waktu: 'asc' }
      });

      if (logs.length > 0) {
        console.log('   ✅ Found relevant logs:');
        logs.forEach(log => {
          console.log(`      ${log.waktu} - ${log.action} -> ${log.status}`);
        });
      } else {
        console.log('   ⚠️  No relevant logs found');
      }
    }

    // Test API call simulation
    console.log('\n🔍 Testing API query simulation...');
    const tasks = await prisma.tasklist.findMany({
      where: {
        projectId: 1, // Assuming project ID 1 exists
      },
      select: {
        id: true,
        kode: true,
        pegawaiId: true,
        projectId: true,
        status: true,
      },
      take: 5
    });

    if (tasks.length > 0) {
      // Get names
      const taskPegawaiIds = tasks.map(t => t.pegawaiId);
      const taskProyekIds = tasks.map(t => t.projectId);
      
      const taskPegawais = await prisma.pegawai.findMany({
        where: { id: { in: taskPegawaiIds } },
        select: { id: true, namaLengkap: true }
      });
      
      const taskProyeks = await prisma.proyek.findMany({
        where: { id: { in: taskProyekIds } },
        select: { id: true, namaProyek: true }
      });
      
      const taskPegawaiMap = new Map(taskPegawais.map(p => [p.id, p.namaLengkap]));
      const taskProyekMap = new Map(taskProyeks.map(p => [p.id, p.namaProyek]));

      console.log('✅ Sample API data:');
      tasks.forEach(task => {
        const pegawaiNama = taskPegawaiMap.get(task.pegawaiId) || 'Unknown';
        const proyekNama = taskProyekMap.get(task.projectId) || 'Unknown Project';
        console.log(`   ${task.kode} - ${pegawaiNama} - ${proyekNama}`);
      });
    } else {
      console.log('⚠️  No tasks found for project ID 1');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testGanttAPI();