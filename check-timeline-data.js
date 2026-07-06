const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTimelineData() {
  try {
    // Ganti dengan ID tasklist yang Anda test
    const tasklistId = 446; // SESUAIKAN DENGAN ID ANDA
    
    console.log(`\n🔍 Checking timeline data for tasklist ID: ${tasklistId}\n`);
    
    // Check if tasklist exists
    const tasklist = await prisma.tasklist.findUnique({
      where: { id: tasklistId },
      select: {
        id: true,
        kode: true,
        status: true,
        createdAt: true
      }
    });
    
    if (!tasklist) {
      console.log('❌ Tasklist not found!');
      return;
    }
    
    console.log('✅ Tasklist found:');
    console.log(JSON.stringify(tasklist, null, 2));
    
    // Check TaskActivity records
    const activities = await prisma.taskActivity.findMany({
      where: { taskId: tasklistId },
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            kode: true
          }
        }
      }
    });
    
    console.log(`\n📊 Found ${activities.length} activities:\n`);
    
    if (activities.length === 0) {
      console.log('⚠️  NO ACTIVITIES FOUND! This is why timeline is empty.');
      console.log('\n💡 Solution: Task was created before TaskActivity logging was implemented.');
      console.log('   You need to create a new task to see timeline data.');
    } else {
      activities.forEach((act, idx) => {
        console.log(`${idx + 1}. Action: ${act.action}`);
        console.log(`   User ID: ${act.userId}`);
        console.log(`   Status: ${act.fromStatus} → ${act.toStatus}`);
        console.log(`   Note: ${act.note || 'N/A'}`);
        console.log(`   Created: ${act.createdAt}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTimelineData();
