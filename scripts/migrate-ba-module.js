const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateBaModule() {
  try {
    console.log('Starting BA and Module migration...');

    // Get all projects
    const projects = await prisma.proyek.findMany({
      select: { id: true, namaProyek: true }
    });

    for (const project of projects) {
      console.log(`Processing project: ${project.namaProyek} (ID: ${project.id})`);

      // Get all modules for this project (old structure)
      const modules = await prisma.proyekModule.findMany({
        where: { projectId: project.id },
        select: {
          id: true,
          ba: true,
          baVersion: true,
          nama: true,
          version: true,
          kode: true,
          parentId: true,
          order: true,
          depth: true,
          isLeaf: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (modules.length === 0) {
        console.log(`  No modules found for project ${project.id}`);
        continue;
      }

      // Group modules by BA
      const baGroups = new Map();
      modules.forEach(module => {
        const baKey = `${module.ba || 'Unknown'}|${module.baVersion || '0.0.1'}`;
        if (!baGroups.has(baKey)) {
          baGroups.set(baKey, []);
        }
        baGroups.get(baKey).push(module);
      });

      console.log(`  Found ${baGroups.size} unique BAs`);

      // Create BA records and update modules
      for (const [baKey, baModules] of baGroups.entries()) {
        const [baName, baVersion] = baKey.split('|');
        
        console.log(`  Creating BA: ${baName} v${baVersion}`);

        // Create or find BA
        let businessAnalyst = await prisma.businessAnalyst.findFirst({
          where: {
            projectId: project.id,
            nama: baName,
            version: baVersion,
          }
        });

        if (!businessAnalyst) {
          businessAnalyst = await prisma.businessAnalyst.create({
            data: {
              projectId: project.id,
              nama: baName,
              version: baVersion,
            }
          });
          console.log(`    Created BA with ID: ${businessAnalyst.id}`);
        } else {
          console.log(`    BA already exists with ID: ${businessAnalyst.id}`);
        }

        // Update modules to reference the BA
        for (const module of baModules) {
          console.log(`    Updating module: ${module.nama} (ID: ${module.id})`);
          
          await prisma.proyekModule.update({
            where: { id: module.id },
            data: {
              baId: businessAnalyst.id,
              // Remove old BA fields (will be handled by schema migration)
            }
          });
        }
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateBaModule()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });