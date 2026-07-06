const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBlueprintStatus() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING BLUEPRINT STATUS');
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

    // Find blueprint for this project
    const blueprint = await prisma.blueprint.findFirst({
      where: {
        proyekId: project.id
      },
      include: {
        requirements: true
      }
    });

    if (!blueprint) {
      console.log('\n❌ NO BLUEPRINT FOUND FOR THIS PROJECT!');
      console.log('This is why UAT items are not being created.');
      console.log('You need to create a blueprint first.');
      return;
    }

    console.log('\n✅ Blueprint found:', {
      id: blueprint.id,
      status: blueprint.blueprintStatus,
      requirementCount: blueprint.requirements.length
    });

    console.log('\n📋 Requirements:');
    blueprint.requirements.forEach((req, idx) => {
      console.log(`  ${idx + 1}. ID: ${req.id}, Status: ${req.status}, Description: ${req.description}`);
    });

    // Check tasklists
    console.log('\n📝 Checking tasklists for these requirements...');
    for (const req of blueprint.requirements) {
      const tasklist = await prisma.tasklist.findFirst({
        where: {
          projectId: project.id,
          keterangan: req.description,
          OR: [
            { tasklistType: 'BLUEPRINT' },
            { pegawaiId: req.assignedTo }
          ]
        }
      });

      if (tasklist) {
        console.log(`  ✅ Requirement ${req.id}: Tasklist found (ID: ${tasklist.id}, Module: ${tasklist.moduleId})`);
      } else {
        console.log(`  ❌ Requirement ${req.id}: NO TASKLIST FOUND!`);
        console.log(`     Looking for: keterangan="${req.description}", projectId=${project.id}`);
      }
    }

    // Check existing UAT items
    console.log('\n🧪 Checking existing UAT items...');
    const uatItems = await prisma.uatTest.findMany({
      where: { projectId: project.id }
    });

    console.log(`Found ${uatItems.length} UAT item(s):`);
    uatItems.forEach(uat => {
      console.log(`  - ${uat.kode} (Module: ${uat.moduleId}, Status: ${uat.status})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('DIAGNOSIS:');
    console.log('='.repeat(80));
    
    if (blueprint.blueprintStatus === 'APPROVED') {
      console.log('✅ Blueprint is APPROVED');
      if (uatItems.length === 0) {
        console.log('❌ BUT NO UAT ITEMS EXIST!');
        console.log('   This means UAT creation failed during approval.');
        console.log('   Check server logs when you clicked Approve button.');
      }
    } else if (blueprint.blueprintStatus === 'DRAFT') {
      console.log('⚠️  Blueprint is still DRAFT - you need to APPROVE it first!');
      console.log('   Go to blueprint page and click the green "Approve" button.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlueprintStatus();
