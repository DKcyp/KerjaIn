const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testGanttTask446() {
  try {
    console.log('🔍 Testing Gantt Chart API for task 446...\n');

    // First, get the task details
    const task = await prisma.tasklist.findUnique({
      where: { id: 446 },
      select: {
        id: true,
        projectId: true,
        moduleId: true,
        pegawaiId: true,
        scheduleAt: true,
        status: true,
        keterangan: true,
        calculatedDueDate: true,
        startedAt: true,
        taskComplexity: true,
        tasklistType: true,
        kode: true,
        imagePath: true,
        module: {
          select: {
            id: true,
            nama: true,
          }
        },
      }
    });

    if (!task) {
      console.log('❌ Task 446 not found');
      return;
    }

    console.log('📋 Raw task data from database:');
    console.log('   ID:', task.id);
    console.log('   Project ID:', task.projectId);
    console.log('   Module ID:', task.moduleId);
    console.log('   Pegawai ID:', task.pegawaiId);
    console.log('   Status:', task.status);
    console.log('   Started At:', task.startedAt);
    console.log('   Module:', task.module);

    // Get pegawai details
    const pegawai = await prisma.pegawai.findUnique({
      where: { id: task.pegawaiId },
      select: { id: true, namaLengkap: true }
    });

    console.log('\n👤 Pegawai data:');
    console.log('   ID:', pegawai?.id);
    console.log('   Nama:', pegawai?.namaLengkap);

    // Get project details
    const proyek = await prisma.proyek.findUnique({
      where: { id: task.projectId },
      select: { id: true, namaProyek: true }
    });

    console.log('\n🏢 Project data:');
    console.log('   ID:', proyek?.id);
    console.log('   Nama:', proyek?.namaProyek);

    // Get task logs for submitted and approved dates
    const logs = await prisma.tasklistLog.findMany({
      where: {
        taskId: 446,
        OR: [
          { action: 'STATUS_CHANGE', status: 'MENUNGGU_REVIEW_PM' },
          { action: 'STATUS_CHANGE', status: 'SELESAI' }
        ]
      },
      select: {
        taskId: true,
        waktu: true,
        action: true,
        status: true,
      },
      orderBy: { waktu: 'asc' }
    });

    console.log('\n📝 Task logs:');
    if (logs.length === 0) {
      console.log('   No relevant logs found');
    } else {
      logs.forEach(log => {
        console.log(`   ${log.waktu} - ${log.action} -> ${log.status}`);
      });
    }

    // Map logs to get dates
    const logsByTask = {};
    logs.forEach((log) => {
      if (!logsByTask[log.taskId]) {
        logsByTask[log.taskId] = {};
      }
      if (log.status === 'MENUNGGU_REVIEW_PM') {
        logsByTask[log.taskId].submittedForReviewAt = log.waktu;
      } else if (log.status === 'SELESAI') {
        logsByTask[log.taskId].approvedAt = log.waktu;
      }
    });

    // Simulate API response format
    const apiResult = {
      id: task.id,
      projectId: task.projectId,
      moduleId: task.moduleId,
      moduleNama: task.module?.nama || 'Unknown Module',
      pegawaiId: task.pegawaiId,
      pegawaiNama: pegawai?.namaLengkap || 'Unknown User',
      proyekNama: proyek?.namaProyek || 'Unknown Project',
      scheduleAt: task.scheduleAt?.toISOString() || new Date().toISOString(),
      status: task.status,
      keterangan: task.keterangan,
      calculatedDueDate: task.calculatedDueDate?.toISOString() || null,
      startedAt: task.startedAt?.toISOString() || null,
      submittedForReviewAt: logsByTask[task.id]?.submittedForReviewAt?.toISOString() || null,
      approvedAt: logsByTask[task.id]?.approvedAt?.toISOString() || null,
      taskComplexity: task.taskComplexity,
      tasklistType: task.tasklistType,
      kode: task.kode,
      imagePath: task.imagePath,
    };

    console.log('\n🔄 API Response format:');
    console.log(JSON.stringify(apiResult, null, 2));

    console.log('\n🎯 Key fields check:');
    console.log('   Programmer (pegawaiNama):', apiResult.pegawaiNama);
    console.log('   Tanggal Realisasi (approvedAt):', apiResult.approvedAt);
    console.log('   Started At:', apiResult.startedAt);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testGanttTask446();