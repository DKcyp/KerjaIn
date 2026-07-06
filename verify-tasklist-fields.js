const { PrismaClient } = require('@prisma/client');

async function verifyTasklistFields() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking Tasklist table structure...\n');
    
    // Get table schema information
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tasklist' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.log('📋 Current Tasklist table columns:');
    console.log('=====================================');
    
    result.forEach((column, index) => {
      const nullable = column.is_nullable === 'YES' ? '(nullable)' : '(required)';
      const defaultVal = column.column_default ? ` [default: ${column.column_default}]` : '';
      const indexStr = (index + 1).toString().padStart(2);
      console.log(`${indexStr}. ${column.column_name.padEnd(30)} ${column.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });
    
    console.log('\n🎯 Checking for specific SLA fields:');
    console.log('=====================================');
    
    const slaFields = [
      'assigneeStartTaskDeadline',
      'assigneeWorkDeadline', 
      'pmReviewDeadline',
      'calculatedDueDate',
      'taskComplexity',
      'isPaused',
      'pausedAt',
      'startedAt',
      'totalDurationMinutes'
    ];
    
    slaFields.forEach(field => {
      const found = result.find(col => col.column_name === field || col.column_name === field.toLowerCase());
      if (found) {
        console.log(`✅ ${field.padEnd(30)} - EXISTS (${found.data_type})`);
      } else {
        console.log(`❌ ${field.padEnd(30)} - MISSING`);
      }
    });
    
    // Test a simple query to ensure fields work
    console.log('\n🧪 Testing field access...');
    console.log('============================');
    
    const sampleTask = await prisma.tasklist.findFirst({
      select: {
        id: true,
        kode: true,
        assigneeStartTaskDeadline: true,
        assigneeWorkDeadline: true,
        pmReviewDeadline: true,
        calculatedDueDate: true,
        taskComplexity: true,
        isPaused: true,
        startedAt: true,
        totalDurationMinutes: true
      }
    });
    
    if (sampleTask) {
      console.log('✅ Successfully accessed SLA fields on sample task:');
      console.log(`   Task ID: ${sampleTask.id}`);
      console.log(`   Task Code: ${sampleTask.kode}`);
      console.log(`   Task Complexity: ${sampleTask.taskComplexity}`);
      console.log(`   Is Paused: ${sampleTask.isPaused}`);
      console.log(`   Total Duration: ${sampleTask.totalDurationMinutes} minutes`);
    } else {
      console.log('ℹ️  No tasks found in database to test with');
    }
    
  } catch (error) {
    console.error('❌ Error checking tasklist fields:', error.message);
    
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n🔧 Detected missing column. Here are the missing fields:');
      const missingField = error.message.match(/column "(\w+)"/)?.[1];
      if (missingField) {
        console.log(`   Missing: ${missingField}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyTasklistFields();
