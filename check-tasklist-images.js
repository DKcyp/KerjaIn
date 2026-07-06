const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTasklistImages() {
  try {
    console.log('🔍 Checking tasklist_image table...\n');

    // Check if table exists and get all records
    const images = await prisma.$queryRaw`
      SELECT * FROM public.tasklist_image 
      ORDER BY "uploadedAt" DESC 
      LIMIT 20
    `;

    console.log(`📊 Total records found: ${images.length}\n`);

    if (images.length === 0) {
      console.log('⚠️  No images found in tasklist_image table');
      console.log('\nℹ️  This could mean:');
      console.log('   1. No images have been uploaded yet');
      console.log('   2. Images are not being saved to the table');
      console.log('   3. The table does not exist yet\n');
    } else {
      console.log('✅ Images found:\n');
      images.forEach((img, index) => {
        console.log(`${index + 1}. Image ID: ${img.id}`);
        console.log(`   Task ID: ${img.taskId}`);
        console.log(`   Original Name: ${img.originalName}`);
        console.log(`   File Name: ${img.fileName}`);
        console.log(`   File Path: ${img.filePath}`);
        console.log(`   File Type: ${img.fileType}`);
        console.log(`   File Size: ${(img.fileSize / 1024).toFixed(2)} KB`);
        console.log(`   Uploaded By: ${img.uploadedBy}`);
        console.log(`   Uploaded At: ${img.uploadedAt}`);
        console.log('');
      });
    }

    // Get count by task
    const countByTask = await prisma.$queryRaw`
      SELECT "taskId", COUNT(*) as count
      FROM public.tasklist_image
      GROUP BY "taskId"
      ORDER BY count DESC
      LIMIT 10
    `;

    if (countByTask.length > 0) {
      console.log('\n📈 Images per task (top 10):');
      countByTask.forEach((row) => {
        console.log(`   Task ${row.taskId}: ${row.count} image(s)`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking tasklist_image table:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('\n⚠️  Table tasklist_image does not exist yet.');
      console.log('   It will be created automatically when the first image is uploaded.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTasklistImages();
