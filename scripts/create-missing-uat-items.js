/**
 * Script to create missing UAT items for completed blueprint requirements
 * Run this to fix existing "Done" requirements that don't have UAT items yet
 */

// Load environment variables from .env.local (same as Next.js app)
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMissingUATItems() {
  try {
    console.log('🔍 Finding completed blueprint requirements without UAT items...\n');

    // Get all DONE requirements
    const doneRequirements = await prisma.blueprintRequirement.findMany({
      where: {
        status: 'DONE'
      },
      include: {
        blueprint: {
          include: {
            proyek: true
          }
        }
      }
    });

    console.log(`Found ${doneRequirements.length} completed requirements\n`);

    let created = 0;
    let skipped = 0;

    for (const req of doneRequirements) {
      // Find the tasklist associated with this requirement (by matching description)
      const tasklist = await prisma.tasklist.findFirst({
        where: {
          projectId: req.blueprint.proyekId,
          keterangan: req.description
        }
      });

      if (!tasklist) {
        console.log(`⏭️  Skipped: No tasklist found for requirement ${req.id} (${req.description})`);
        skipped++;
        continue;
      }

      const uatCode = `UAT-${req.blueprint.proyek.kodeProyek}-${tasklist.moduleId}-${req.id}`;
      
      // Check if UAT item already exists
      const existingUAT = await prisma.uatTest.findFirst({
        where: {
          projectId: req.blueprint.proyekId,
          moduleId: tasklist.moduleId,
          kode: uatCode
        }
      });

      if (existingUAT) {
        console.log(`⏭️  Skipped: UAT already exists for requirement ${req.id} (${req.description})`);
        skipped++;
        continue;
      }

      // Create UAT test item
      await prisma.uatTest.create({
        data: {
          namaFitur: req.description,
          kode: uatCode,
          projectId: req.blueprint.proyekId,
          moduleId: tasklist.moduleId,
          testerId: req.assignedTo,
          tanggalTest: new Date(),
          status: 'Pending',
          deskripsi: `Auto-created from blueprint requirement: ${req.description}`
        }
      });

      console.log(`✅ Created UAT item for requirement ${req.id}:`);
      console.log(`   Project: ${req.blueprint.proyek.namaProyek}`);
      console.log(`   Module ID: ${tasklist.moduleId}`);
      console.log(`   Code: ${uatCode}`);
      console.log(`   Description: ${req.description}\n`);
      created++;
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created} UAT items`);
    console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);
    console.log(`   📝 Total processed: ${doneRequirements.length} requirements`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingUATItems();
