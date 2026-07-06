const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function cleanupProductionImages() {
  try {
    console.log('🧹 Cleaning up broken image paths on production...');
    
    const tasksWithImages = await prisma.tasklist.findMany({
      where: {
        imagePath: { not: null }
      },
      select: {
        id: true,
        kode: true,
        imagePath: true
      }
    });
    
    console.log(`📊 Found ${tasksWithImages.length} tasks with image paths`);
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
    let removedCount = 0;
    
    for (const task of tasksWithImages) {
      if (!task.imagePath) continue;
      
      const filename = task.imagePath.replace('/uploads/tasklist/', '');
      const fullPath = path.join(uploadsDir, filename);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`❌ Removing broken path for ${task.kode}: ${filename}`);
        
        await prisma.tasklist.update({
          where: { id: task.id },
          data: { imagePath: null }
        });
        
        removedCount++;
      } else {
        console.log(`✅ ${task.kode}: File exists`);
      }
    }
    
    // Also clean logs
    try {
      const result = await prisma.$executeRaw`
        UPDATE tasklist_log 
        SET "imagePath" = NULL 
        WHERE "imagePath" IS NOT NULL
      `;
      console.log(`🧹 Cleaned tasklist_log entries`);
    } catch (e) {
      console.log('⚠️ Could not clean logs (table might not exist)');
    }
    
    console.log(`\n📈 Production cleanup completed:`);
    console.log(`   Removed broken paths: ${removedCount}`);
    
  } catch (error) {
    console.error('❌ Production cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupProductionImages();
