const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateBlueprints() {
  console.log('Starting blueprint data migration...');

  try {
    // Step 1: Get all blueprints
    const blueprints = await prisma.blueprint.findMany({
      select: {
        id: true,
        projectId: true,
        projectName: true,
        client: true,
        pic: true
      }
    });

    console.log(`Found ${blueprints.length} blueprints to migrate`);

    // Step 2: For each blueprint, create or find matching proyek
    for (const blueprint of blueprints) {
      console.log(`Processing blueprint ${blueprint.id} with projectId: ${blueprint.projectId}`);

      // Check if proyek already exists with this kodeProyek
      let proyek = await prisma.proyek.findUnique({
        where: { kodeProyek: blueprint.projectId }
      });

      if (!proyek) {
        // Create new proyek
        const maxNoUrut = await prisma.proyek.aggregate({
          _max: { noUrut: true }
        });
        const nextNoUrut = (maxNoUrut._max.noUrut || 0) + 1;

        proyek = await prisma.proyek.create({
          data: {
            kodeProyek: blueprint.projectId,
            namaProyek: blueprint.projectName,
            client: blueprint.client,
            pic: blueprint.pic,
            noUrut: nextNoUrut
          }
        });
        console.log(`Created new proyek ${proyek.id} for blueprint ${blueprint.id}`);
      } else {
        // Update existing proyek with client and pic if they're empty
        if (!proyek.client || !proyek.pic) {
          proyek = await prisma.proyek.update({
            where: { id: proyek.id },
            data: {
              ...((!proyek.client && blueprint.client) && { client: blueprint.client }),
              ...((!proyek.pic && blueprint.pic) && { pic: blueprint.pic })
            }
          });
          console.log(`Updated existing proyek ${proyek.id} for blueprint ${blueprint.id}`);
        }
      }

      // Step 3: Update blueprint with proyekId
      await prisma.blueprint.update({
        where: { id: blueprint.id },
        data: { proyekId: proyek.id }
      });

      console.log(`Linked blueprint ${blueprint.id} to proyek ${proyek.id}`);
    }

    console.log('Blueprint data migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateBlueprints()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
