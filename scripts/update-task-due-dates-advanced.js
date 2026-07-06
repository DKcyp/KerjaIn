const { PrismaClient } = require('@prisma/client');

async function updateTaskDueDatesAdvanced(options = {}) {
  const prisma = new PrismaClient();
  
  const {
    mode = 'schedule', // 'schedule' | 'complexity' | 'both'
    forceUpdate = false, // Update even if due date already exists
    dryRun = false // Just show what would be updated without actually updating
  } = options;
  
  try {
    console.log(`🔧 Advanced Task Due Date Update (Mode: ${mode})`);
    console.log(`   Force Update: ${forceUpdate}`);
    console.log(`   Dry Run: ${dryRun}\n`);
    
    // Get task complexity data for calculations
    const complexityData = await prisma.taskComplexity.findMany();
    const complexityMap = {};
    complexityData.forEach(c => {
      complexityMap[c.complexity] = c.hours;
    });
    
    console.log('📊 Available complexity levels:');
    Object.entries(complexityMap).forEach(([complexity, hours]) => {
      console.log(`   ${complexity}: ${hours} hours`);
    });
    
    // Build where condition
    const whereCondition = forceUpdate ? {} : { calculatedDueDate: null };
    
    // Get tasks that need updating
    const tasksToUpdate = await prisma.tasklist.findMany({
      where: whereCondition,
      select: {
        id: true,
        kode: true,
        scheduleAt: true,
        calculatedDueDate: true,
        taskComplexity: true,
        status: true
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`\n📋 Found ${tasksToUpdate.length} tasks to update\n`);
    
    if (tasksToUpdate.length === 0) {
      console.log('✅ No tasks need updating!');
      return;
    }
    
    let updateCount = 0;
    const updates = [];
    
    for (const task of tasksToUpdate) {
      let newDueDate;
      
      switch (mode) {
        case 'schedule':
          // Set due date = schedule date
          newDueDate = task.scheduleAt;
          break;
          
        case 'complexity':
          // Calculate due date based on task complexity
          const complexityHours = complexityMap[task.taskComplexity] || 8; // Default 8 hours
          newDueDate = new Date(task.scheduleAt);
          newDueDate.setHours(newDueDate.getHours() + complexityHours);
          break;
          
        case 'both':
          // Use complexity if available, otherwise use schedule
          if (task.taskComplexity && complexityMap[task.taskComplexity]) {
            const complexityHours = complexityMap[task.taskComplexity];
            newDueDate = new Date(task.scheduleAt);
            newDueDate.setHours(newDueDate.getHours() + complexityHours);
          } else {
            newDueDate = task.scheduleAt;
          }
          break;
          
        default:
          newDueDate = task.scheduleAt;
      }
      
      updates.push({
        id: task.id,
        kode: task.kode,
        oldDueDate: task.calculatedDueDate,
        newDueDate: newDueDate,
        scheduleAt: task.scheduleAt,
        complexity: task.taskComplexity,
        status: task.status
      });
      
      updateCount++;
    }
    
    // Show preview of updates
    console.log('🔍 Preview of updates (first 10):');
    console.log('=================================');
    updates.slice(0, 10).forEach((update, index) => {
      const scheduled = new Date(update.scheduleAt).toLocaleString('id-ID');
      const newDue = new Date(update.newDueDate).toLocaleString('id-ID');
      const oldDue = update.oldDueDate ? new Date(update.oldDueDate).toLocaleString('id-ID') : 'null';
      
      console.log(`${index + 1}. Task ${update.kode || update.id} (${update.complexity || 'N/A'})`);
      console.log(`   Scheduled: ${scheduled}`);
      console.log(`   Old Due:   ${oldDue}`);
      console.log(`   New Due:   ${newDue}`);
      console.log('');
    });
    
    if (updates.length > 10) {
      console.log(`   ... and ${updates.length - 10} more tasks\n`);
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN - No actual updates performed');
      console.log(`   Would update ${updateCount} tasks`);
      return;
    }
    
    // Perform the actual updates
    console.log(`🚀 Updating ${updateCount} tasks...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Update in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        // Use transaction for batch update
        await prisma.$transaction(
          batch.map(update => 
            prisma.tasklist.update({
              where: { id: update.id },
              data: { calculatedDueDate: update.newDueDate }
            })
          )
        );
        
        successCount += batch.length;
        console.log(`   Batch ${Math.floor(i/batchSize) + 1}: Updated ${batch.length} tasks`);
        
      } catch (error) {
        errorCount += batch.length;
        console.error(`   Batch ${Math.floor(i/batchSize) + 1}: Error updating ${batch.length} tasks:`, error.message);
      }
    }
    
    // Final verification
    console.log('\n🔍 Verifying updates...');
    const finalCount = await prisma.tasklist.count({
      where: {
        calculatedDueDate: { not: null }
      }
    });
    
    console.log('\n🎉 Task due date update completed!');
    console.log('==================================');
    console.log(`✅ ${successCount} tasks updated successfully`);
    if (errorCount > 0) {
      console.log(`❌ ${errorCount} tasks failed to update`);
    }
    console.log(`📊 Total tasks with due dates: ${finalCount}`);
    console.log(`🔧 Update mode used: ${mode}`);
    
  } catch (error) {
    console.error('❌ Error updating task due dates:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  args.forEach(arg => {
    if (arg === '--force') options.forceUpdate = true;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg.startsWith('--mode=')) options.mode = arg.split('=')[1];
  });
  
  console.log('📖 Usage: node update-task-due-dates-advanced.js [options]');
  console.log('   Options:');
  console.log('   --mode=schedule   Set due date = schedule date (default)');
  console.log('   --mode=complexity Set due date = schedule + complexity hours');
  console.log('   --mode=both       Use complexity if available, otherwise schedule');
  console.log('   --force           Update even if due date already exists');
  console.log('   --dry-run         Preview changes without updating\n');
  
  updateTaskDueDatesAdvanced(options);
}

module.exports = { updateTaskDueDatesAdvanced };
