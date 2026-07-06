const { PrismaClient } = require('@prisma/client');

async function addRemainingFields() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Adding remaining missing fields...\n');
    
    // Add calculatedDueDate field
    console.log('Adding calculatedDueDate field...');
    try {
      await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "calculatedDueDate" TIMESTAMP NULL`;
      console.log('✅ calculatedDueDate field added');
    } catch (error) {
      console.log(`⚠️  calculatedDueDate: ${error.message}`);
    }
    
    // Create SlaType enum if it doesn't exist
    console.log('Creating SlaType enum...');
    try {
      await prisma.$executeRaw`
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SlaType') THEN
                CREATE TYPE "SlaType" AS ENUM ('EASY', 'MEDIUM', 'HARD');
            END IF;
        END $$;
      `;
      console.log('✅ SlaType enum created/verified');
    } catch (error) {
      console.log(`⚠️  SlaType enum: ${error.message}`);
    }
    
    // Add taskComplexity field
    console.log('Adding taskComplexity field...');
    try {
      await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "taskComplexity" "SlaType" DEFAULT 'MEDIUM'`;
      console.log('✅ taskComplexity field added');
    } catch (error) {
      console.log(`⚠️  taskComplexity: ${error.message}`);
    }
    
    // Add indexes
    console.log('Adding indexes...');
    try {
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_calculatedDueDate" ON tasklist("calculatedDueDate")`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_taskComplexity" ON tasklist("taskComplexity")`;
      console.log('✅ Indexes added');
    } catch (error) {
      console.log(`⚠️  Indexes: ${error.message}`);
    }
    
    console.log('\n🎉 Remaining fields added!');
    
    // Test the fields
    console.log('\n🧪 Testing added fields...');
    try {
      await prisma.$queryRaw`SELECT "calculatedDueDate" FROM tasklist LIMIT 1`;
      console.log('✅ calculatedDueDate - NOW WORKS');
    } catch (e) { 
      console.log('❌ calculatedDueDate - STILL ERROR'); 
    }
    
    try {
      await prisma.$queryRaw`SELECT "taskComplexity" FROM tasklist LIMIT 1`;
      console.log('✅ taskComplexity - NOW WORKS');
    } catch (e) { 
      console.log('❌ taskComplexity - STILL ERROR'); 
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRemainingFields();
