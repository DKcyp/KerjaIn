/**
 * Fix missing dep_id column in tasklist table
 * Run this script to add the column without running full Prisma migration
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixDepIdColumn() {
  try {
    console.log('🔧 Checking if dep_id column exists in tasklist table...');
    
    // Check if column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasklist' 
      AND column_name = 'dep_id'
    `;
    
    if (result.length > 0) {
      console.log('✅ Column dep_id already exists in tasklist table');
      return;
    }
    
    console.log('⚠️  Column dep_id does not exist, adding it now...');
    
    // Add the column
    await prisma.$executeRaw`
      ALTER TABLE tasklist ADD COLUMN dep_id INTEGER
    `;
    
    console.log('✅ Column dep_id added successfully');
    
    // Add index
    console.log('🔧 Adding index on dep_id...');
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_tasklist_dep_id ON tasklist(dep_id)
    `;
    
    console.log('✅ Index added successfully');
    
    // Verify
    const verify = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tasklist' 
      AND column_name = 'dep_id'
    `;
    
    console.log('✅ Verification:', verify);
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixDepIdColumn()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
