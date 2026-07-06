const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecentImageUploads() {
  try {
    console.log('🔍 Checking recent image uploads and their logs...\n');

    // Get recent tasks with images
    const recentImages = await prisma.$queryRaw`
      SELECT 
        ti.*,
        t.kode as task_code,
        t.status as task_status,
        t.programmer_description
      FROM public.tasklist_image ti
      JOIN public.tasklist t ON t.id = ti."taskId"
      ORDER BY ti."uploadedAt" DESC
      LIMIT 10
    `;

    console.log(`📊 Found ${recentImages.length} recent image uploads:\n`);

    for (const img of recentImages) {
      console.log(`📸 Image ID: ${img.id}`);
      console.log(`   Task: ${img.task_code} (ID: ${img.taskId})`);
      console.log(`   Status: ${img.task_status}`);
      console.log(`   Programmer Description: ${img.programmer_description || '(none)'}`);
      console.log(`   File: ${img.originalName}`);
      console.log(`   Uploaded: ${img.uploadedAt}`);

      // Get related logs
      const logs = await prisma.$queryRaw`
        SELECT 
          id,
          waktu,
          keterangan,
          status,
          action
        FROM public.tasklist_log
        WHERE "taskId" = ${img.taskId}
        AND waktu >= ${new Date(new Date(img.uploadedAt).getTime() - 60000)}
        AND waktu <= ${new Date(new Date(img.uploadedAt).getTime() + 60000)}
        ORDER BY waktu DESC
      `;

      if (logs.length > 0) {
        console.log(`   📝 Related logs (within 1 minute):`);
        logs.forEach(log => {
          console.log(`      - ${log.action}: ${log.keterangan?.substring(0, 100) || '(no description)'}`);
        });
      }
      console.log('');
    }

    // Check for tasks with "dengan lampiran" description
    console.log('\n🔍 Checking tasks with "dengan lampiran" description:\n');
    
    const tasksWithDefaultDesc = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.kode,
        t.status,
        t.programmer_description,
        t."updatedAt",
        COUNT(ti.id) as image_count
      FROM public.tasklist t
      LEFT JOIN public.tasklist_image ti ON ti."taskId" = t.id
      WHERE t.programmer_description = 'dengan lampiran'
      GROUP BY t.id, t.kode, t.status, t.programmer_description, t."updatedAt"
      ORDER BY t."updatedAt" DESC
      LIMIT 5
    `;

    if (tasksWithDefaultDesc.length > 0) {
      console.log(`✅ Found ${tasksWithDefaultDesc.length} tasks with default description:\n`);
      tasksWithDefaultDesc.forEach(task => {
        console.log(`   Task ${task.kode} (ID: ${task.id})`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Images: ${task.image_count}`);
        console.log(`   Updated: ${task.updatedAt}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No tasks found with "dengan lampiran" description yet.\n');
      console.log('   This is expected if you haven\'t tested the new feature yet.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentImageUploads();
