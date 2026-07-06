const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseUATDisplay() {
  try {
    console.log('='.repeat(80));
    console.log('DIAGNOSING UAT DISPLAY ISSUE');
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

    console.log('\n✅ Project:', {
      id: project.id,
      kodeProyek: project.kodeProyek,
      namaProyek: project.namaProyek
    });

    // Get all modules for this project
    const modules = await prisma.proyekModule.findMany({
      where: { projectId: project.id },
      orderBy: { id: 'asc' }
    });

    console.log(`\n📁 Modules (${modules.length}):`);
    modules.forEach(m => {
      console.log(`  - ID: ${m.id}, Code: ${m.kode || 'N/A'}, Name: ${m.nama}, isLeaf: ${m.isLeaf}, parentId: ${m.parentId || 'null'}`);
    });

    // Get all UAT tests for this project
    const uatTests = await prisma.uatTest.findMany({
      where: { projectId: project.id },
      include: {
        tester: {
          select: { namaLengkap: true }
        }
      }
    });

    console.log(`\n🧪 UAT Tests (${uatTests.length}):`);
    if (uatTests.length === 0) {
      console.log('  ❌ NO UAT TESTS FOUND!');
      
      // Check for completed tasks
      const completedTasks = await prisma.tasklist.findMany({
        where: {
          projectId: project.id,
          status: 'SELESAI'
        }
      });
      
      console.log(`\n  Found ${completedTasks.length} completed tasks:`);
      completedTasks.forEach(t => {
        console.log(`    - Task ${t.kode}: moduleId=${t.moduleId}, type=${t.tasklistType}`);
      });
      
    } else {
      uatTests.forEach(uat => {
        const module = modules.find(m => m.id === uat.moduleId);
        console.log(`  - UAT ${uat.kode}:`);
        console.log(`      moduleId: ${uat.moduleId}`);
        console.log(`      moduleName: ${module?.nama || 'NOT FOUND'}`);
        console.log(`      moduleCode: ${module?.kode || 'N/A'}`);
        console.log(`      isLeaf: ${module?.isLeaf}`);
        console.log(`      tester: ${uat.tester?.namaLengkap}`);
        console.log(`      status: ${uat.status}`);
      });
    }

    // Check what the API would return
    console.log('\n🔍 Simulating API call /api/uat?projectId=' + project.id);
    const apiData = uatTests.map(item => ({
      id: item.id,
      namaFitur: item.namaFitur,
      kode: item.kode,
      projectId: item.projectId,
      moduleId: item.moduleId,
      testerId: item.testerId,
      testerName: item.tester?.namaLengkap || 'Unknown',
      tanggalTest: item.tanggalTest.toISOString(),
      status: item.status,
    }));
    
    console.log('API would return:', JSON.stringify(apiData, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseUATDisplay();
