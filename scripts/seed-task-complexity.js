const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTaskComplexity() {
  console.log('🌱 Seeding Task Complexity data...');

  try {
    // Default task complexity configurations
    const complexityLevels = [
      {
        complexity: 'EASY',
        hours: 2.0,
        points: 5,
        description: 'Simple tasks that can be completed quickly with minimal complexity',
        isActive: true
      },
      {
        complexity: 'MEDIUM',
        hours: 8.0,
        points: 10,
        description: 'Moderate complexity tasks requiring standard development time',
        isActive: true
      },
      {
        complexity: 'HARD',
        hours: 24.0,
        points: 20,
        description: 'Complex tasks requiring extensive development time and expertise',
        isActive: true
      }
    ];

    // Upsert each complexity level
    for (const level of complexityLevels) {
      const result = await prisma.taskComplexity.upsert({
        where: {
          complexity: level.complexity
        },
        update: {
          hours: level.hours,
          points: level.points,
          description: level.description,
          isActive: level.isActive,
          updatedAt: new Date()
        },
        create: level
      });

      console.log(`✅ ${level.complexity}: ${level.hours}h, ${level.points} points`);
    }

    console.log('🎉 Task Complexity seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding task complexity:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedTaskComplexity();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedTaskComplexity };
