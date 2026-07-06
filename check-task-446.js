const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTask446() {
  try {
    console.log('🔍 Checking task ID 446...\n');

    // Get task details
    const task = await prisma.tasklist.findUnique({
      where: { id: 446 },
      select: {
        id: true,
        kode: true,
        pegawaiId: true,
        projectId: true,
        moduleId: true,
        status: true,
        scheduleAt: true,
        calculatedDueDate: true,
        updatedAt: true,
      }
    });

    if (!task) {
      console.log('❌ Task 446 not found');
      return;
    }

    console.log('📋 Task 446 details:');
    console.log('   Kode:', task.kode);
    console.log('   Pegawai ID:', task.pegawaiId);
    console.log('   Project ID:', task.projectId);
    console.log('   Module ID:', task.moduleId);
    console.log('   Status:', task.status);
    console.log('   Updated At:', task.updatedAt);

    // Get pegawai details
    if (task.pegawaiId) {
      const pegawai = await prisma.pegawai.findUnique({
        where: { id: task.pegawaiId },
        select: {
          id: true,
          namaLengkap: true,
        }
      });

      if (pegawai) {
        console.log('\n👤 Pegawai details:');
        console.log('   ID:', pegawai.id);
        console.log('   Nama:', pegawai.namaLengkap);
      } else {
        console.log('\n❌ Pegawai not found for ID:', task.pegawaiId);
      }
    }

    // Get project details
    if (task.projectId) {
      const proyek = await prisma.proyek.findUnique({
        where: { id: task.projectId },
        select: {
          id: true,
          namaProyek: true,
        }
      });

      if (proyek) {
        console.log('\n🏢 Project details:');
        console.log('   ID:', proyek.id);
        console.log('   Nama:', proyek.namaProyek);
      } else {
        console.log('\n❌ Project not found for ID:', task.projectId);
      }
    }

    // Get module details
    if (task.moduleId) {
      const module = await prisma.proyekModule.findUnique({
        where: { id: task.moduleId },
        select: {
          id: true,
          nama: true,
        }
      });

      if (module) {
        console.log('\n📁 Module details:');
        console.log('   ID:', module.id);
        console.log('   Nama:', module.nama);
      } else {
        console.log('\n❌ Module not found for ID:', task.moduleId);
      }
    }

    // Check logs for this task
    const logs = await prisma.tasklistLog.findMany({
      where: {
        taskId: 446,
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
      console.log('\n📝 Relevant logs:');
      logs.forEach(log => {
        console.log(`   ${log.waktu} - ${log.action} -> ${log.status}`);
      });
    } else {
      console.log('\n⚠️  No relevant logs found for dates');
    }

    // Test API simulation for this specific task
    console.log('\n🔍 API simulation for task 446:');
    
    const pegawaiMap = new Map();
    const proyekMap = new Map();
    
    if (task.pegawaiId) {
      const pegawai = await prisma.pegawai.findUnique({
        where: { id: task.pegawaiId },
        select: { id: true, namaLengkap: true }
      });
      if (pegawai) {
        pegawaiMap.set(pegawai.id, pegawai.namaLengkap);
      }
    }
    
    if (task.projectId) {
      const proyek = await prisma.proyek.findUnique({
        where: { id: task.projectId },
        select: { id: true, namaProyek: true }
      });
      if (proyek) {
        proyekMap.set(proyek.id, proyek.namaProyek);
      }
    }

    const apiResult = {
      id: task.id,
      kode: task.kode,
      pegawaiId: task.pegawaiId,
      pegawaiNama: pegawaiMap.get(task.pegawaiId) || 'Unknown User',
      proyekNama: proyekMap.get(task.projectId) || 'Unknown Project',
      status: task.status,
    };

    console.log('   API Result:', JSON.stringify(apiResult, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTask446();