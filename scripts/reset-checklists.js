const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultChecklists = [
  { title: 'Server', description: 'Server setup and configuration completed', order: 1 },
  { title: 'Domain', description: 'Domain and DNS configuration completed', order: 2 },
];

async function resetChecklists() {
  try {
    console.log('🔄 Resetting Go-Live checklists to 2 items...\n');

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

      // Delete all existing checklists
      if (goLive.checklists.length > 0) {
        console.log(`   🗑️  Deleting ${goLive.checklists.length} old checklists...`);
        await prisma.goLiveChecklist.deleteMany({
          where: { goLiveId: goLive.id }
        });
      }

      // Add new 2 checklists
      console.log(`   ➕ Adding 2 new checklists (Server & Domain)...`);
      await prisma.goLiveChecklist.createMany({
        data: defaultChecklists.map(checklist => ({
          goLiveId: goLive.id,
          ...checklist,
        }))
      });

      console.log(`   ✅ Reset complete! Now has 2 checklists\n`);
    }

    console.log('✅ All Go-Live records updated!\n');
    console.log('💡 Refresh your browser to see the changes (Ctrl+Shift+R)\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetChecklists();
