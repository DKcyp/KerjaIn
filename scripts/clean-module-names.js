/**
 * Script to clean module names that have "id:name" format
 * This removes the "id:" prefix from module names in both ba_module and proyek_module tables
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanModuleNames() {
  console.log('Starting module name cleanup...');

  try {
    // Clean ba_module table
    console.log('\n1. Cleaning ba_module table...');
    const baModules = await prisma.bAModule.findMany({
      where: {
        nama: {
          contains: ':'
        }
      }
    });

    console.log(`Found ${baModules.length} ba_modules with ":" in name`);

    for (const module of baModules) {
      const cleanedName = module.nama.includes(':') 
        ? module.nama.split(':').slice(1).join(':').trim()
        : module.nama;

      if (cleanedName !== module.nama) {
        await prisma.bAModule.update({
          where: { id: module.id },
          data: { nama: cleanedName }
        });
        console.log(`  Updated ba_module ${module.id}: "${module.nama}" -> "${cleanedName}"`);
      }
    }

    // Clean proyek_module table
    console.log('\n2. Cleaning proyek_module table...');
    const proyekModules = await prisma.proyekModule.findMany({
      where: {
        nama: {
          contains: ':'
        }
      }
    });

    console.log(`Found ${proyekModules.length} proyek_modules with ":" in name`);

    for (const module of proyekModules) {
      const cleanedName = module.nama.includes(':') 
        ? module.nama.split(':').slice(1).join(':').trim()
        : module.nama;

      if (cleanedName !== module.nama) {
        await prisma.proyekModule.update({
          where: { id: module.id },
          data: { nama: cleanedName }
        });
        console.log(`  Updated proyek_module ${module.id}: "${module.nama}" -> "${cleanedName}"`);
      }
    }

    console.log('\n✅ Module name cleanup completed successfully!');
    console.log(`Total ba_modules cleaned: ${baModules.filter(m => m.nama.includes(':')).length}`);
    console.log(`Total proyek_modules cleaned: ${proyekModules.filter(m => m.nama.includes(':')).length}`);

  } catch (error) {
    console.error('❌ Error cleaning module names:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanModuleNames()
  .then(() => {
    console.log('\nScript finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
