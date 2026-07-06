const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExistingData() {
  try {
    console.log('🔍 Checking existing data...');
    
    const projects = await prisma.proyek.count();
    const modules = await prisma.proyekModule.count();
    const tasks = await prisma.tasklist.count();
    
    console.log(`📊 Current data:
    - Projects: ${projects}
    - Modules: ${modules}
    - Tasks: ${tasks}`);
    
    // Show sample modules with BA info
    const sampleModules = await prisma.proyekModule.findMany({
      take: 10,
      select: {
        id: true,
        nama: true,
        ba: true,
        baVersion: true,
        projectId: true,
        kode: true,
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log('\n📋 Sample modules with BA info:');
    sampleModules.forEach(m => {
      console.log(`  - ID: ${m.id} | ${m.nama} | BA: ${m.ba || 'N/A'} v${m.baVersion || 'N/A'} | Project: ${m.projectId}`);
    });

    // Group by BA to see structure
    const baGroups = new Map();
    sampleModules.forEach(module => {
      const baKey = `${module.ba || 'Unknown'}|${module.baVersion || '0.0.1'}`;
      if (!baGroups.has(baKey)) {
        baGroups.set(baKey, []);
      }
      baGroups.get(baKey).push(module);
    });

    console.log('\n📊 BA Groups:');
    for (const [baKey, modules] of baGroups.entries()) {
      const [baName, baVersion] = baKey.split('|');
      console.log(`  - ${baName} v${baVersion}: ${modules.length} modules`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingData();