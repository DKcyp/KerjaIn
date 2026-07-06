const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultChecklists = [
  { title: 'Server', description: 'Server setup and configuration completed', order: 1 },
  { title: 'Domain', description: 'Domain and DNS configuration completed', order: 2 },
];

async function addDefaultChecklists() {
  try {
    console.log('🔍 Finding Go-Live records without checklists...\n');

    // Get all Go-Live records
    const goLiveRecords = await prisma.goLive.findMany({
      include: {
        checklists: true,
        project: {
          select: {
            kodeProyek: true,
            namaProyek: true,
          }
        }
      }
    });

    console.log(`Found ${goLiveRecords.length} Go-Live record(s)\n`);

    for (const goLive of goLiveRecords) {
      console.log(`📋 Project: ${goLive.project.kodeProyek} - ${goLive.project.namaProyek}`);
      console.log(`   Go-Live ID: ${goLive.id}`);
      console.log(`   Current checklists: ${goLive.checklists.length}`);

      if (goLive.checklists.length === 0) {
        console.log(`   ➕ Adding ${defaultChecklists.length} default checklists...`);

        await prisma.goLiveChecklist.createMany({
          data: defaultChecklists.map(checklist => ({
            goLiveId: goLive.id,
            ...checklist,
          }))
        });

        console.log(`   ✅ Added ${defaultChecklists.length} checklists!`);
      } else if (goLive.checklists.length < 8) {
        console.log(`   ⚠️  Has ${goLive.checklists.length} checklists (expected 8)`);
        console.log(`   💡 You may want to manually review this record`);
      } else {
        console.log(`   ✅ Already has checklists`);
      }
      console.log('');
    }

    console.log('✅ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultChecklists();
