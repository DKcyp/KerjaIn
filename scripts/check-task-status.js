const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTaskStatus() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING TASK STATUS FOR PROJECT: PRJ-2025-11-07-5085-qweqweqweqwe');
    console.log('='.repeat(80));

    // Find the project
    const project = await prisma.proyek.findFirst({
      where: {
        kodeProyek: 'PRJ-2025-11-07-5085-qweqweqweqwe'
      }
    });

    if (!project) {
      console.log('❌ Project not found!');
      return;
    }

    console.log('\n✅ Project found:', {
      id: project.id,
      kodeProyek: project.kodeProyek,
      namaProyek: project.namaProyek
    });

    // Find all tasks for this project
    const tasks = await prisma.tasklist.findMany({
      where: {
        projectId: project.id
      },
      include: {
        module: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    console.log(`\n📋 Found ${tasks.length} task(s):\n`);

    for (const task of tasks) {
      console.log('─'.repeat(80));
      console.log('Task Details:');
      console.log('  ID:', task.id);
      console.log('  Code:', task.kode);
      console.log('  Status:', task.status);
      console.log('  Type:', task.tasklistType);
      console.log('  Module ID:', task.moduleId);
      console.log('  Module Name:', task.module?.nama || 'N/A');
      console.log('  Description:', task.keterangan || 'N/A');
      console.log('  Created:', task.createdAt);
      console.log('  Updated:', task.updatedAt);
      
      // Check if this task should have a UAT
      if (task.status === 'SELESAI' && (task.tasklistType === 'DEVELOPMENT' || task.tasklistType === 'BLUEPRINT')) {
        console.log('  ✅ This task SHOULD have a UAT created!');
        
        // Check if UAT exists
        const uatKode = `UAT-${task.kode}`;
        const uat = await prisma.uatTest.findFirst({
          where: { kode: uatKode }
        });
        
        if (uat) {
          console.log('  ✅ UAT exists:', uatKode);
        } else {
          console.log('  ❌ UAT MISSING! Expected code:', uatKode);
        }
      } else {
        console.log('  ℹ️  No UAT expected (status:', task.status, ', type:', task.tasklistType + ')');
      }
    }

    // Check all UAT tests for this project
    console.log('\n' + '='.repeat(80));
    const allUats = await prisma.uatTest.findMany({
      where: { projectId: project.id }
    });
    
    console.log(`\n🧪 Total UAT tests in database: ${allUats.length}`);
    if (allUats.length > 0) {
      allUats.forEach(uat => {
        console.log('  -', uat.kode, '(moduleId:', uat.moduleId + ')');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTaskStatus();
