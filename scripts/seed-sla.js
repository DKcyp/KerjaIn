const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSLA() {
  console.log('🌱 Seeding SLA configurations...');

  try {
    // Default SLA configurations
    const slaConfigs = [
      {
        slaType: 'EASY',
        assigneeStartTask: 30,      // 30 minutes to start
        assigneeWorkDuration: 120,  // 2 hours to complete
        pmReviewDuration: 60,       // 1 hour for PM review
      },
      {
        slaType: 'MEDIUM',
        assigneeStartTask: 60,      // 1 hour to start
        assigneeWorkDuration: 480,  // 8 hours to complete
        pmReviewDuration: 120,      // 2 hours for PM review
      },
      {
        slaType: 'HARD',
        assigneeStartTask: 120,     // 2 hours to start
        assigneeWorkDuration: 1440, // 24 hours to complete
        pmReviewDuration: 240,      // 4 hours for PM review
      },
    ];

    // Upsert SLA configurations
    for (const config of slaConfigs) {
      const result = await prisma.masterSla.upsert({
        where: { slaType: config.slaType },
        update: {
          assigneeStartTask: config.assigneeStartTask,
          assigneeWorkDuration: config.assigneeWorkDuration,
          pmReviewDuration: config.pmReviewDuration,
        },
        create: config,
      });

      console.log(`✅ SLA configuration for ${config.slaType}: ${result.id}`);
    }

    console.log('🎉 SLA seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding SLA configurations:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedSLA();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { seedSLA };
