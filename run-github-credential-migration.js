const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔍 Checking if github_credential table exists...');
    
    // Check if table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'github_credential'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ github_credential table already exists');
      return;
    }
    
    console.log('📝 Creating github_credential table...');
    
    // Read and execute migration SQL
    const migrationPath = path.join(__dirname, 'prisma/migrations/20251228_add_github_credential/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await prisma.$executeRawUnsafe(migrationSQL);
    
    console.log('✅ github_credential table created successfully');
    
    // Update migration history
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid(),
        '0',
        NOW(),
        '20251228_add_github_credential',
        '',
        NULL,
        NOW(),
        1
      );
    `;
    
    console.log('✅ Migration recorded in _prisma_migrations table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();