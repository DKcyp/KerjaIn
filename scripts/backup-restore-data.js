const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backupData() {
  try {
    console.log('🔄 Creating backup of existing data...');

    // Backup all modules with their BA info
    const modules = await prisma.proyekModule.findMany({
      include: {
        tasklist: {
          include: {
            chats: true,
          }
        }
      }
    });

    console.log(`📦 Found ${modules.length} modules to backup`);

    // Save to JSON file
    const fs = require('fs');
    const backupData = {
      timestamp: new Date().toISOString(),
      modules: modules,
    };

    fs.writeFileSync('backup-modules.json', JSON.stringify(backupData, null, 2));
    console.log('✅ Backup saved to backup-modules.json');

    return backupData;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}

async function restoreData() {
  try {
    console.log('🔄 Restoring data from backup...');

    const fs = require('fs');
    if (!fs.existsSync('backup-modules.json')) {
      console.log('❌ No backup file found');
      return;
    }

    const backupData = JSON.parse(fs.readFileSync('backup-modules.json', 'utf8'));
    console.log(`📦 Found ${backupData.modules.length} modules in backup`);

    // Group modules by project and BA
    const projectBaMap = new Map();
    
    for (const module of backupData.modules) {
      const projectId = module.projectId;
      const baKey = `${module.ba || 'Unknown'}|${module.baVersion || '0.0.1'}`;
      
      if (!projectBaMap.has(projectId)) {
        projectBaMap.set(projectId, new Map());
      }
      
      if (!projectBaMap.get(projectId).has(baKey)) {
        projectBaMap.get(projectId).set(baKey, {
          ba: module.ba || 'Unknown',
          baVersion: module.baVersion || '0.0.1',
          modules: []
        });
      }
      
      projectBaMap.get(projectId).get(baKey).modules.push(module);
    }

    // Restore data with new structure
    for (const [projectId, baMap] of projectBaMap.entries()) {
      console.log(`🔄 Processing project ${projectId}`);
      
      for (const [baKey, baData] of baMap.entries()) {
        console.log(`  Creating BA: ${baData.ba} v${baData.baVersion}`);
        
        // Create or find BA
        let businessAnalyst = await prisma.businessAnalyst.findFirst({
          where: {
            projectId: parseInt(projectId),
            nama: baData.ba,
            version: baData.baVersion,
          }
        });

        if (!businessAnalyst) {
          businessAnalyst = await prisma.businessAnalyst.create({
            data: {
              projectId: parseInt(projectId),
              nama: baData.ba,
              version: baData.baVersion,
            }
          });
        }

        // Restore modules
        for (const moduleData of baData.modules) {
          console.log(`    Restoring module: ${moduleData.nama}`);
          
          // Check if module already exists
          const existingModule = await prisma.proyekModule.findUnique({
            where: { id: moduleData.id }
          });

          if (!existingModule) {
            // Create module with new structure
            const newModule = await prisma.proyekModule.create({
              data: {
                id: moduleData.id,
                projectId: moduleData.projectId,
                baId: businessAnalyst.id,
                parentId: moduleData.parentId,
                nama: moduleData.nama,
                order: moduleData.order,
                depth: moduleData.depth,
                isLeaf: moduleData.isLeaf,
                kode: moduleData.kode,
                version: moduleData.version || '0.0.1',
                createdAt: moduleData.createdAt,
                updatedAt: moduleData.updatedAt,
              }
            });

            // Restore tasklists
            for (const task of moduleData.tasklist) {
              await prisma.tasklist.create({
                data: {
                  id: task.id,
                  projectId: task.projectId,
                  moduleId: newModule.id,
                  pegawaiId: task.pegawaiId,
                  createdBy: task.createdBy,
                  scheduleAt: task.scheduleAt,
                  status: task.status,
                  keterangan: task.keterangan,
                  programmerDescription: task.programmerDescription,
                  createdAt: task.createdAt,
                  updatedAt: task.updatedAt,
                  imagePath: task.imagePath,
                  kode: task.kode,
                  statusCode: task.statusCode,
                  idCrm: task.idCrm,
                  idDep: task.idDep,
                  ticketId: task.ticketId,
                  ticketUrl: task.ticketUrl,
                  tasklistType: task.tasklistType,
                  assigneeStartTaskDeadline: task.assigneeStartTaskDeadline,
                  assigneeWorkDeadline: task.assigneeWorkDeadline,
                  pmReviewDeadline: task.pmReviewDeadline,
                  calculatedDueDate: task.calculatedDueDate,
                  taskComplexity: task.taskComplexity,
                  customDurationHours: task.customDurationHours,
                  isPaused: task.isPaused,
                  pausedAt: task.pausedAt,
                  startedAt: task.startedAt,
                  totalDurationMinutes: task.totalDurationMinutes,
                }
              });
            }
          } else {
            // Update existing module to use new structure
            await prisma.proyekModule.update({
              where: { id: moduleData.id },
              data: {
                baId: businessAnalyst.id,
              }
            });
          }
        }
      }
    }

    console.log('✅ Data restored successfully!');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

async function checkCurrentData() {
  try {
    console.log('🔍 Checking current database state...');
    
    const projects = await prisma.proyek.count();
    const modules = await prisma.proyekModule.count();
    const tasks = await prisma.tasklist.count();
    const bas = await prisma.businessAnalyst.count();
    
    console.log(`📊 Current data:
    - Projects: ${projects}
    - Modules: ${modules}
    - Tasks: ${tasks}
    - Business Analysts: ${bas}`);
    
    // Show sample data
    const sampleModules = await prisma.proyekModule.findMany({
      take: 5,
      select: {
        id: true,
        nama: true,
        ba: true,
        baVersion: true,
        baId: true,
      }
    });
    
    console.log('\n📋 Sample modules:');
    sampleModules.forEach(m => {
      console.log(`  - ${m.nama} | BA: ${m.ba || 'N/A'} | baId: ${m.baId || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'backup':
    backupData().then(() => process.exit(0)).catch(() => process.exit(1));
    break;
  case 'restore':
    restoreData().then(() => process.exit(0)).catch(() => process.exit(1));
    break;
  case 'check':
    checkCurrentData();
    break;
  default:
    console.log(`
Usage: node scripts/backup-restore-data.js [command]

Commands:
  backup  - Create backup of current data
  restore - Restore data from backup
  check   - Check current database state
    `);
    process.exit(0);
}