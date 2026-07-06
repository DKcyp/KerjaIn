const { PrismaClient } = require('@prisma/client');

async function addMissingEnumValue() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Adding missing TaskStatus enum value...\n');
    
    // Add the missing SEDANG_DIPROSES_USER_PAUSED value to TaskStatus enum
    console.log('Adding SEDANG_DIPROSES_USER_PAUSED to TaskStatus enum...');
    
    await prisma.$executeRaw`
      ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'SEDANG_DIPROSES_USER_PAUSED';
    `;
    
    console.log('✅ SEDANG_DIPROSES_USER_PAUSED added to TaskStatus enum');
    
    // Verify the enum now has all expected values
    console.log('\n🔍 Verifying updated enum values...');
    const result = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'TaskStatus'
      )
      ORDER BY enumlabel;
    `;
    
    console.log('📋 Updated TaskStatus enum values:');
    console.log('==================================');
    result.forEach((row, index) => {
      console.log(`${index + 1}. ${row.enumlabel}`);
    });
    
    // Test that the enum value works
    console.log('\n🧪 Testing the new enum value...');
    try {
      // Try to query using the new enum value (this should not fail now)
      await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM tasklist 
        WHERE status = 'SEDANG_DIPROSES_USER_PAUSED'::TaskStatus;
      `;
      console.log('✅ New enum value works correctly!');
    } catch (error) {
      console.log(`❌ Error testing new enum value: ${error.message}`);
    }
    
    console.log('\n🎉 TaskStatus enum updated successfully!');
    console.log('The task time tracking system should now work properly.');
    
  } catch (error) {
    console.error('❌ Error adding enum value:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  The enum value already exists, which is fine.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addMissingEnumValue();
