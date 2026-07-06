const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUATCreation() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING UAT CREATION FOR PROJECT: PRJ-2025-11-07-5085-qweqweqweqwe');
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
        id: 'asc'
      }
    });

    console.log(`\n📋 Found ${tasks.length} task(s) for this project:\n`);

    for (const task of tasks) {
      console.log('Task:', {
        id: task.id,
        kode: task.kode,
        status: task.status,
        tasklistType: task.tasklistType,
        moduleId: task.moduleId,
        moduleName: task.module?.nama,
        keterangan: task.keterangan
      });
    }

    // Find all UAT tests for this project
    const uatTests = await prisma.uatTest.findMany({
      where: {
        projectId: project.id
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`\n🧪 Found ${uatTests.length} UAT test(s) for this project:\n`);

    if (uatTests.length > 0) {
      for (const uat of uatTests) {
        console.log('UAT Test:', {
          id: uat.id,
          kode: uat.kode,
          namaFitur: uat.namaFitur,
          moduleId: uat.moduleId,
          status: uat.status,
          testerId: uat.testerId
        });
      }
    } else {
      console.log('❌ No UAT tests found!');
      
      // Check if any tasks are completed
      const completedTasks = tasks.filter(t => t.status === 'SELESAI');
      if (completedTasks.length > 0) {
        console.log('\n⚠️  WARNING: Found completed tasks but no UAT tests!');
        console.log('Completed tasks:', completedTasks.map(t => ({
          id: t.id,
          kode: t.kode,
          tasklistType: t.tasklistType
        })));
      }
    }

    // Check the module structure
    console.log('\n📁 Module structure for this project:');
    const modules = await prisma.proyekModule.findMany({
      where: {
        projectId: project.id
      },
      orderBy: {
        kode: 'asc'
      }
    });

    for (const mod of modules) {
      console.log(`  ${mod.kode || 'NO-CODE'} - ${mod.nama} (ID: ${mod.id}, isLeaf: ${mod.isLeaf})`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUATCreation();
