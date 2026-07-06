const { PrismaClient } = require('@prisma/client');

async function verifyAllFields() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking all tasklist table columns...\n');
    
    // Get all columns in tasklist table
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tasklist' 
      AND table_schema = 'public'
      ORDER BY column_name;
    `;
    
    console.log('📋 All Tasklist table columns:');
    console.log('=====================================');
    
    result.forEach((column, index) => {
      const nullable = column.is_nullable === 'YES' ? '(nullable)' : '(required)';
      const defaultVal = column.column_default ? ` [default: ${column.column_default}]` : '';
      console.log(`${(index + 1).toString().padStart(2)}. ${column.column_name.padEnd(35)} ${column.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });
    
    console.log('\n🎯 Checking for specific fields (both camelCase and snake_case):');
    console.log('================================================================');
    
    const fieldsToCheck = [
      // SLA fields
      { prisma: 'assigneeStartTaskDeadline', db: 'assigneeStartTaskDeadline' },
      { prisma: 'assigneeWorkDeadline', db: 'assigneeWorkDeadline' },
      { prisma: 'pmReviewDeadline', db: 'pmReviewDeadline' },
      { prisma: 'calculatedDueDate', db: 'calculatedDueDate' },
      { prisma: 'taskComplexity', db: 'taskComplexity' },
      
      // Time tracking fields (check both naming conventions)
      { prisma: 'isPaused', db: 'is_paused' },
      { prisma: 'pausedAt', db: 'paused_at' },
      { prisma: 'startedAt', db: 'started_at' },
      { prisma: 'totalDurationMinutes', db: 'total_duration_minutes' }
    ];
    
    fieldsToCheck.forEach(field => {
      const found = result.find(col => 
        col.column_name === field.db || 
        col.column_name === field.prisma
      );
      
      if (found) {
        console.log(`✅ ${field.prisma.padEnd(30)} - EXISTS as "${found.column_name}" (${found.data_type})`);
      } else {
        console.log(`❌ ${field.prisma.padEnd(30)} - MISSING (expected: ${field.db})`);
      }
    });
    
    // Test Prisma access to these fields
    console.log('\n🧪 Testing Prisma field access...');
    console.log('==================================');
    
    try {
      const sampleTask = await prisma.tasklist.findFirst({
        select: {
          id: true,
          kode: true,
          assigneeStartTaskDeadline: true,
          assigneeWorkDeadline: true,
          pmReviewDeadline: true,
          calculatedDueDate: true,
          taskComplexity: true,
          // Test time tracking fields with mapped names
          isPaused: true,
          pausedAt: true,
          startedAt: true,
          totalDurationMinutes: true
        }
      });
      
      if (sampleTask) {
        console.log('✅ Successfully accessed all fields via Prisma:');
        console.log(`   Task ID: ${sampleTask.id}`);
        console.log(`   Task Code: ${sampleTask.kode}`);
        console.log(`   Task Complexity: ${sampleTask.taskComplexity}`);
        console.log(`   Is Paused: ${sampleTask.isPaused}`);
        console.log(`   Total Duration: ${sampleTask.totalDurationMinutes} minutes`);
      } else {
        console.log('ℹ️  No tasks found in database to test with');
      }
    } catch (error) {
      console.log(`❌ Error accessing fields via Prisma: ${error.message}`);
      
      if (error.message.includes('Unknown arg')) {
        console.log('   This suggests the Prisma schema needs to be regenerated');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking fields:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllFields();
