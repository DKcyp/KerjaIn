const { PrismaClient } = require('@prisma/client');

async function populateTaskDueDates() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Populating task due dates from scheduled dates...\n');
    
    // First, check how many tasks need due dates populated
    const tasksWithoutDueDate = await prisma.tasklist.count({
      where: {
        calculatedDueDate: null
      }
    });
    
    const totalTasks = await prisma.tasklist.count();
    
    console.log(`📊 Task Statistics:`);
    console.log(`   Total tasks: ${totalTasks}`);
    console.log(`   Tasks without due date: ${tasksWithoutDueDate}`);
    console.log(`   Tasks with due date: ${totalTasks - tasksWithoutDueDate}`);
    
    if (tasksWithoutDueDate === 0) {
      console.log('\n✅ All tasks already have due dates set!');
      return;
    }
    
    console.log(`\n🚀 Updating ${tasksWithoutDueDate} tasks...`);
    
    // Use raw SQL to update all tasks at once
    console.log('Executing bulk update...');
    
    const result = await prisma.$executeRaw`
      UPDATE tasklist 
      SET "calculatedDueDate" = "scheduleAt" 
      WHERE "calculatedDueDate" IS NULL;
    `;
    
    console.log(`✅ Updated ${result} tasks successfully!`);
    
    // Verify the update
    console.log('\n🔍 Verifying the update...');
    
    const verifyResult = await prisma.tasklist.count({
      where: {
        calculatedDueDate: null
      }
    });
    
    console.log(`   Tasks still without due date: ${verifyResult}`);
    
    // Show some sample results
    console.log('\n📋 Sample updated tasks:');
    console.log('========================');
    
    const sampleTasks = await prisma.tasklist.findMany({
      select: {
        id: true,
        kode: true,
        scheduleAt: true,
        calculatedDueDate: true,
        status: true
      },
      where: {
        calculatedDueDate: {
          not: null
        }
      },
      take: 5,
      orderBy: {
        updatedAt: 'desc'
      }
    });
    
    sampleTasks.forEach((task, index) => {
      const scheduleDate = new Date(task.scheduleAt).toLocaleString('id-ID');
      const dueDate = new Date(task.calculatedDueDate).toLocaleString('id-ID');
      const match = scheduleDate === dueDate ? '✅' : '⚠️';
      
      console.log(`${index + 1}. Task ${task.kode || task.id} (${task.status})`);
      console.log(`   Scheduled: ${scheduleDate}`);
      console.log(`   Due Date:  ${dueDate} ${match}`);
      console.log('');
    });
    
    // Summary
    const finalCount = await prisma.tasklist.count({
      where: {
        calculatedDueDate: {
          not: null
        }
      }
    });
    
    console.log('🎉 Task due date population completed!');
    console.log('=====================================');
    console.log(`✅ ${finalCount} tasks now have due dates`);
    console.log(`✅ ${result} tasks were updated in this run`);
    console.log(`✅ Due dates are set to match scheduled dates`);
    
    if (verifyResult > 0) {
      console.log(`⚠️  ${verifyResult} tasks still need due dates (may have null scheduleAt)`);
    }
    
  } catch (error) {
    console.error('❌ Error populating task due dates:', error.message);
    
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n🔧 The calculatedDueDate column may not exist yet.');
      console.log('   Please run the database migration first to add missing fields.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  populateTaskDueDates();
}

module.exports = { populateTaskDueDates };
