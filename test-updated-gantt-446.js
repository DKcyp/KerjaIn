const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUpdatedGantt446() {
  try {
    console.log('🔍 Testing updated Gantt Chart API logic for task 446...\n');

    // Get the task with updatedAt field
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
        updatedAt: true,
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

    // Get pegawai and project data
    const pegawai = await prisma.pegawai.findUnique({
      where: { id: task.pegawaiId },
      select: { id: true, namaLengkap: true }
    });

    const proyek = await prisma.proyek.findUnique({
      where: { id: task.projectId },
      select: { id: true, namaProyek: true }
    });

    // Get task logs
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

    // Apply the new logic: use log date if available, otherwise use updatedAt for completed tasks
    const approvedAt = logsByTask[task.id]?.approvedAt || 
      (task.status === 'SELESAI' ? task.updatedAt : null);

    console.log('📋 Task data:');
    console.log('   Status:', task.status);
    console.log('   Updated At:', task.updatedAt);
    console.log('   Log approved date:', logsByTask[task.id]?.approvedAt || 'null');
    console.log('   Final approved date:', approvedAt);

    // Simulate updated API response
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
      approvedAt: approvedAt?.toISOString() || null,
      taskComplexity: task.taskComplexity,
      tasklistType: task.tasklistType,
      kode: task.kode,
      imagePath: task.imagePath,
    };

    console.log('\n🔄 Updated API Response:');
    console.log(JSON.stringify(apiResult, null, 2));

    console.log('\n🎯 Key fields check:');
    console.log('   Programmer (pegawaiNama):', apiResult.pegawaiNama);
    console.log('   Tanggal Realisasi (approvedAt):', apiResult.approvedAt);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdatedGantt446();