const { PrismaClient } = require('@prisma/client');

async function addMissingFields() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Adding missing tasklist fields...\n');
    
    // Add SLA deadline fields
    console.log('Adding SLA deadline fields...');
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "assigneeStartTaskDeadline" TIMESTAMP NULL`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "assigneeWorkDeadline" TIMESTAMP NULL`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "pmReviewDeadline" TIMESTAMP NULL`;
    console.log('✅ SLA deadline fields added');
    
    // Add calculated due date field
    console.log('Adding calculated due date field...');
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "calculatedDueDate" TIMESTAMP NULL`;
    console.log('✅ Calculated due date field added');
    
    // Create SlaType enum if it doesn't exist
    console.log('Creating SlaType enum...');
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SlaType') THEN
              CREATE TYPE "SlaType" AS ENUM ('EASY', 'MEDIUM', 'HARD');
          END IF;
      END $$;
    `;
    console.log('✅ SlaType enum created');
    
    // Add task complexity field
    console.log('Adding task complexity field...');
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "taskComplexity" "SlaType" DEFAULT 'MEDIUM'`;
    console.log('✅ Task complexity field added');
    
    // Add time tracking fields
    console.log('Adding time tracking fields...');
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP NULL`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP NULL`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "total_duration_minutes" INTEGER DEFAULT 0`;
    await prisma.$executeRaw`ALTER TABLE tasklist ADD COLUMN IF NOT EXISTS "is_paused" BOOLEAN DEFAULT FALSE`;
    console.log('✅ Time tracking fields added');
    
    // Add indexes for performance
    console.log('Adding indexes...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_assigneeStartTaskDeadline" ON tasklist("assigneeStartTaskDeadline")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_assigneeWorkDeadline" ON tasklist("assigneeWorkDeadline")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_pmReviewDeadline" ON tasklist("pmReviewDeadline")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_calculatedDueDate" ON tasklist("calculatedDueDate")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_taskComplexity" ON tasklist("taskComplexity")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_started_at" ON tasklist("started_at")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_tasklist_is_paused" ON tasklist("is_paused")`;
    console.log('✅ Indexes added');
    
    console.log('\n🎉 All missing fields added successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying fields...');
    const testFields = [
      'assigneeStartTaskDeadline',
      'assigneeWorkDeadline', 
      'pmReviewDeadline',
      'calculatedDueDate',
      'taskComplexity',
      'started_at',
      'paused_at',
      'total_duration_minutes',
      'is_paused'
    ];
    
    for (const field of testFields) {
      try {
        const query = `SELECT ${field} FROM tasklist LIMIT 1`;
        await prisma.$queryRawUnsafe(query);
        console.log(`✅ ${field} - EXISTS`);
      } catch (error) {
        console.log(`❌ ${field} - ERROR: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error adding fields:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addMissingFields();
