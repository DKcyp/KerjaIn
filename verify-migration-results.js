const { PrismaClient } = require('@prisma/client');

async function verifyMigrationResults() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verifying Migration Results');
    console.log('==============================\n');
    
    // Check database connection
    console.log('📡 Testing database connection...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful\n');
    
    // Check all tasklist columns
    console.log('📋 Checking tasklist table structure...');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tasklist' 
      AND table_schema = 'public'
      ORDER BY column_name;
    `;
    
    console.log(`Found ${columns.length} columns in tasklist table:`);
    columns.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`${(index + 1).toString().padStart(2)}. ${col.column_name.padEnd(35)} ${col.data_type.padEnd(20)} ${nullable}`);
    });
    
    // Check for specific fields we added
    console.log('\n🎯 Checking for specific added fields:');
    const expectedFields = [
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
    
    expectedFields.forEach(field => {
      const found = columns.find(col => col.column_name === field);
      if (found) {
        console.log(`✅ ${field.padEnd(30)} - EXISTS (${found.data_type})`);
      } else {
        console.log(`❌ ${field.padEnd(30)} - MISSING`);
      }
    });
    
    // Check TaskStatus enum values
    console.log('\n📊 Checking TaskStatus enum values...');
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TaskStatus')
      ORDER BY enumlabel;
    `;
    
    console.log('TaskStatus enum values:');
    enumValues.forEach((val, index) => {
      console.log(`${index + 1}. ${val.enumlabel}`);
    });
    
    // Check SlaType enum values
    console.log('\n📊 Checking SlaType enum values...');
    try {
      const slaEnumValues = await prisma.$queryRaw`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SlaType')
        ORDER BY enumlabel;
      `;
      
      console.log('SlaType enum values:');
      slaEnumValues.forEach((val, index) => {
        console.log(`${index + 1}. ${val.enumlabel}`);
      });
    } catch (error) {
      console.log('❌ SlaType enum not found');
    }
    
    // Check seeded data
    console.log('\n📈 Checking seeded data...');
    
    const roleCount = await prisma.masterRole.count();
    const permissionCount = await prisma.masterPermission.count();
    const userRoleCount = await prisma.userRole.count();
    const slaCount = await prisma.masterSla.count();
    const complexityCount = await prisma.taskComplexity.count();
    const taskCount = await prisma.tasklist.count();
    const tasksWithDueDates = await prisma.tasklist.count({
      where: { calculatedDueDate: { not: null } }
    });
    
    console.log(`✅ Master Roles: ${roleCount}`);
    console.log(`✅ Master Permissions: ${permissionCount}`);
    console.log(`✅ User Role Assignments: ${userRoleCount}`);
    console.log(`✅ SLA Configurations: ${slaCount}`);
    console.log(`✅ Task Complexity Levels: ${complexityCount}`);
    console.log(`✅ Total Tasks: ${taskCount}`);
    console.log(`✅ Tasks with Due Dates: ${tasksWithDueDates}`);
    
    // Test a simple query to ensure everything works
    console.log('\n🧪 Testing system functionality...');
    try {
      const sampleTask = await prisma.tasklist.findFirst({
        select: {
          id: true,
          kode: true,
          status: true,
          calculatedDueDate: true,
          taskComplexity: true
        }
      });
      
      if (sampleTask) {
        console.log('✅ Sample task query successful:');
        console.log(`   ID: ${sampleTask.id}`);
        console.log(`   Code: ${sampleTask.kode}`);
        console.log(`   Status: ${sampleTask.status}`);
        console.log(`   Due Date: ${sampleTask.calculatedDueDate ? new Date(sampleTask.calculatedDueDate).toLocaleString('id-ID') : 'null'}`);
        console.log(`   Complexity: ${sampleTask.taskComplexity}`);
      }
    } catch (error) {
      console.log(`❌ Error testing functionality: ${error.message}`);
    }
    
    console.log('\n🎉 Migration verification completed!');
    
  } catch (error) {
    console.error('❌ Error verifying migration:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigrationResults();
