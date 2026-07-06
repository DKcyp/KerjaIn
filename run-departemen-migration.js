const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🚀 Starting migration: Add Master Departemen...\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20260326_add_master_departemen', 'migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments and split by semicolon
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      console.log(`SQL: ${statement.substring(0, 100)}...\n`);
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log('✅ Success\n');
      } catch (error) {
        // Check if error is about existing table/column
        if (error.message.includes('already exists')) {
          console.log('⚠️  Already exists, skipping...\n');
        } else {
          console.error('❌ Error:', error.message);
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Verifying table creation...');

    // Verify table exists
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'master_departemen'
    `;

    if (result.length > 0) {
      console.log('✅ Table master_departemen created successfully!\n');
      
      // Check if pegawai has departemen_id column
      const columnCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pegawai' 
        AND column_name = 'departemen_id'
      `;
      
      if (columnCheck.length > 0) {
        console.log('✅ Column departemen_id added to pegawai table!\n');
      }
    }

    console.log('🎉 All done! You can now use the MasterDepartemen model.\n');
    console.log('Next steps:');
    console.log('1. Run: npx prisma generate');
    console.log('2. Restart your development server\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
