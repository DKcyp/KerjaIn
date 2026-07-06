const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🚀 Starting Prisma migration: Add tasklistId to backlog table...');
    
    // Generate Prisma migration
    console.log('📝 Generating Prisma migration...');
    execSync('npx prisma migrate dev --name add_tasklistid_to_backlog', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Summary:');
    console.log('   - Added tasklistId column to backlog table');
    console.log('   - Added index for better query performance');
    console.log('   - Updated Prisma client');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Check if it's a "no changes" error
    if (error.message && error.message.includes('no changes')) {
      console.log('ℹ️  No schema changes detected, migration skipped.');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Alternative: Manual migration for existing databases
async function runManualMigration() {
  try {
    console.log('🔧 Running manual migration...');
    
    // Check if column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'backlog' AND column_name = 'tasklistId'
    `;
    
    if (Array.isArray(result) && result.length > 0) {
      console.log('ℹ️  Column tasklistId already exists, skipping migration.');
      return;
    }
    
    // Add column
    await prisma.$executeRaw`ALTER TABLE "backlog" ADD COLUMN "tasklistId" INTEGER`;
    console.log('✅ Added tasklistId column');
    
    // Add index
    await prisma.$executeRaw`CREATE INDEX "backlog_tasklistId_idx" ON "backlog"("tasklistId")`;
    console.log('✅ Added index on tasklistId');
    
    console.log('✅ Manual migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Manual migration failed:', error);
    throw error;
  }
}

// Run the migration
const migrationMode = process.argv[2] || 'prisma';

if (migrationMode === 'manual') {
  runManualMigration()
    .then(() => {
      console.log('🎉 Manual migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Manual migration process failed:', error);
      process.exit(1);
    });
} else {
  runMigration()
    .then(() => {
      console.log('🎉 Prisma migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Prisma migration process failed:', error);
      console.log('💡 Try running with manual mode: node run-migration.js manual');
      process.exit(1);
    });
}