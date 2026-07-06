const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTaskStatus() {
  try {
    const task = await prisma.tasklist.findUnique({
      where: { id: 2896 },
      select: {
        id: true,
        kode: true,
        status: true,
        startedAt: true,
        programmerDescription: true
      }
    });

    if (task) {
      console.log('📋 Task 2896 Status:\n');
      console.log('   ID:', task.id);
      console.log('   Kode:', task.kode);
      console.log('   Status:', task.status);
      console.log('   Started At:', task.startedAt || '(not started)');
      console.log('   Programmer Description:', task.programmerDescription || '(none)');
      console.log('');

      if (task.status === 'SEDANG_DIPROSES_USER' && task.startedAt) {
        console.log('✅ Task ready for "Kirim Review" test');
      } else if (task.status === 'MENUNGGU_PROSES_USER') {
        console.log('⚠️  Task needs to be started first (click "Mulai" button)');
      } else {
        console.log(`⚠️  Task is in ${task.status} status - not suitable for test`);
      }
    } else {
      console.log('❌ Task 2896 not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTaskStatus();
