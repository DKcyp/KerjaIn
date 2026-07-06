const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log('🔄 Creating sample data...');

    // Use existing project or create new one
    let project = await prisma.proyek.findFirst({
      where: { kodeProyek: 'PRJ001' }
    });

    if (!project) {
      // Get max noUrut
      const maxProject = await prisma.proyek.findFirst({
        orderBy: { noUrut: 'desc' },
        select: { noUrut: true }
      });
      const nextNoUrut = maxProject ? maxProject.noUrut + 1 : 1;

      project = await prisma.proyek.create({
        data: {
          noUrut: nextNoUrut,
          kodeProyek: `PRJ${String(nextNoUrut).padStart(3, '0')}`,
          namaProyek: 'Sample Project',
          client: 'Sample Client',
          type: 'DEVELOPMENT',
          isActive: true,
        }
      });
      console.log(`✅ Created project: ${project.namaProyek} (ID: ${project.id})`);
    } else {
      console.log(`✅ Using existing project: ${project.namaProyek} (ID: ${project.id})`);
    }

    // Create sample programmer or use existing one
    let programmer = await prisma.pegawai.findFirst({
      where: { role: 'PROGRAMMER' }
    });

    if (!programmer) {
      // Get max noUrut
      const maxPegawai = await prisma.pegawai.findFirst({
        orderBy: { noUrut: 'desc' },
        select: { noUrut: true }
      });
      const nextNoUrut = maxPegawai ? maxPegawai.noUrut + 1 : 1;

      programmer = await prisma.pegawai.create({
        data: {
          noUrut: nextNoUrut,
          namaLengkap: 'John Doe',
          noHp: '081234567890',
          role: 'PROGRAMMER',
        }
      });
      console.log(`✅ Created programmer: ${programmer.namaLengkap} (ID: ${programmer.id})`);
    } else {
      console.log(`✅ Using existing programmer: ${programmer.namaLengkap} (ID: ${programmer.id})`);
    }

    // Create sample Business Analysts
    const ba1 = await prisma.businessAnalyst.create({
      data: {
        projectId: project.id,
        nama: 'User Management',
        version: '1.0.0',
      }
    });

    const ba2 = await prisma.businessAnalyst.create({
      data: {
        projectId: project.id,
        nama: 'Reporting System',
        version: '1.0.0',
      }
    });

    console.log(`✅ Created BAs: ${ba1.nama}, ${ba2.nama}`);

    // Create sample modules for BA1
    const module1 = await prisma.proyekModule.create({
      data: {
        projectId: project.id,
        baId: ba1.id,
        nama: 'Login Module',
        kode: '01',
        version: '1.0.0',
        depth: 0,
        order: 0,
        isLeaf: false,
      }
    });

    const module2 = await prisma.proyekModule.create({
      data: {
        projectId: project.id,
        baId: ba1.id,
        parentId: module1.id,
        nama: 'Authentication',
        kode: '01.01',
        version: '1.0.0',
        depth: 1,
        order: 0,
        isLeaf: true,
      }
    });

    const module3 = await prisma.proyekModule.create({
      data: {
        projectId: project.id,
        baId: ba1.id,
        parentId: module1.id,
        nama: 'User Registration',
        kode: '01.02',
        version: '1.0.0',
        depth: 1,
        order: 1,
        isLeaf: true,
      }
    });

    // Create sample modules for BA2
    const module4 = await prisma.proyekModule.create({
      data: {
        projectId: project.id,
        baId: ba2.id,
        nama: 'Dashboard Module',
        kode: '02',
        version: '1.0.0',
        depth: 0,
        order: 0,
        isLeaf: true,
      }
    });

    console.log(`✅ Created modules: ${module1.nama}, ${module2.nama}, ${module3.nama}, ${module4.nama}`);

    // Create sample tasks
    const task1 = await prisma.tasklist.create({
      data: {
        projectId: project.id,
        moduleId: module2.id,
        pegawaiId: programmer.id,
        scheduleAt: new Date(),
        status: 'MENUNGGU_PROSES_USER',
        keterangan: 'Implement login form',
        programmerDescription: 'Create login form with validation',
        kode: 'T001',
        taskComplexity: 'MEDIUM',
        customDurationHours: 8,
      }
    });

    const task2 = await prisma.tasklist.create({
      data: {
        projectId: project.id,
        moduleId: module3.id,
        pegawaiId: programmer.id,
        scheduleAt: new Date(),
        status: 'MENUNGGU_PROSES_USER',
        keterangan: 'Create registration API',
        programmerDescription: 'Develop user registration endpoint',
        kode: 'T002',
        taskComplexity: 'HARD',
        customDurationHours: 16,
      }
    });

    const task3 = await prisma.tasklist.create({
      data: {
        projectId: project.id,
        moduleId: module4.id,
        pegawaiId: programmer.id,
        scheduleAt: new Date(),
        status: 'MENUNGGU_PROSES_USER',
        keterangan: 'Build dashboard charts',
        programmerDescription: 'Create interactive charts for dashboard',
        kode: 'T003',
        taskComplexity: 'EASY',
        customDurationHours: 4,
      }
    });

    console.log(`✅ Created tasks: ${task1.keterangan}, ${task2.keterangan}, ${task3.keterangan}`);

    console.log('\n🎉 Sample data created successfully!');
    console.log(`
📊 Summary:
- Project: ${project.namaProyek}
- BAs: 2 (${ba1.nama}, ${ba2.nama})
- Modules: 4
- Tasks: 3
- Programmer: ${programmer.namaLengkap}
    `);

  } catch (error) {
    console.error('❌ Failed to create sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData()
  .then(() => {
    console.log('✅ Sample data creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Sample data creation failed:', error);
    process.exit(1);
  });