const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTasklistHRIS() {
    try {
        console.log('🌱 Starting seed tasklist for HRIS project...\n');

        // 1. Cari project HRIS
        const hrisProject = await prisma.proyek.findFirst({
            where: {
                OR: [
                    { namaProyek: { contains: 'HRIS', mode: 'insensitive' } },
                    { namaProyek: { contains: 'HR', mode: 'insensitive' } },
                    { kodeProyek: { contains: 'HRIS', mode: 'insensitive' } }
                ]
            },
            include: {
                team: true
            }
        });

        if (!hrisProject) {
            console.log('❌ Project HRIS tidak ditemukan!');
            console.log('📝 Membuat project HRIS baru...\n');

            // Cari atau buat team untuk HRIS
            let hrisTeam = await prisma.masterTeam.findFirst({
                where: {
                    nama: { contains: 'HR', mode: 'insensitive' }
                }
            });

            if (!hrisTeam) {
                hrisTeam = await prisma.masterTeam.create({
                    data: {
                        nama: 'Human Resources',
                        deskripsi: 'Tim Human Resources & HRIS Development',
                        type: 'PRODUCT',
                        isActive: true
                    }
                });
                console.log(`✅ Team created: ${hrisTeam.nama} (ID: ${hrisTeam.id})`);
            }

            // Buat project HRIS
            const newProject = await prisma.proyek.create({
                data: {
                    noUrut: await getNextNoUrut(),
                    kodeProyek: 'HRIS-2026',
                    namaProyek: 'HRIS - Human Resource Information System',
                    client: 'Internal',
                    pic: 'HR Manager',
                    type: 'DEVELOPMENT',
                    isActive: true,
                    teamId: hrisTeam.id
                }
            });

            console.log(`✅ Project created: ${newProject.namaProyek} (ID: ${newProject.id})\n`);

            // Buat modules untuk project HRIS
            const modules = [
                { nama: 'Employee Management', kode: 'EMP' },
                { nama: 'Attendance System', kode: 'ATT' },
                { nama: 'Payroll Management', kode: 'PAY' },
                { nama: 'Leave Management', kode: 'LVE' },
                { nama: 'Performance Appraisal', kode: 'PER' },
                { nama: 'Recruitment', kode: 'REC' }
            ];

            for (const module of modules) {
                await prisma.proyekModule.create({
                    data: {
                        projectId: newProject.id,
                        nama: module.nama,
                        kode: module.kode,
                        order: 0,
                        depth: 0,
                        isLeaf: true
                    }
                });
            }

            console.log(`✅ Created ${modules.length} modules for HRIS project\n`);

            // Refresh project data
            const createdProject = await prisma.proyek.findUnique({
                where: { id: newProject.id },
                include: { team: true }
            });

            await seedTasksForProject(createdProject);
        } else {
            console.log(`✅ Found project: ${hrisProject.namaProyek} (ID: ${hrisProject.id})`);
            console.log(`   Team: ${hrisProject.team?.nama || 'No team'}\n`);

            await seedTasksForProject(hrisProject);
        }

        console.log('\n✅ Seed completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function seedTasksForProject(project) {
    // Ambil modules dari project
    const modules = await prisma.proyekModule.findMany({
        where: { projectId: project.id },
        take: 6 // Ambil max 6 modules
    });

    if (modules.length === 0) {
        console.log('⚠️  No modules found for this project. Creating default module...');
        const defaultModule = await prisma.proyekModule.create({
            data: {
                projectId: project.id,
                nama: 'General Development',
                kode: 'GEN',
                order: 0,
                depth: 0,
                isLeaf: true
            }
        });
        modules.push(defaultModule);
    }

    console.log(`📦 Found ${modules.length} modules\n`);

    // Ambil pegawai untuk assign tasks
    const pegawais = await prisma.pegawai.findMany({
        where: {
            role: { in: ['PROGRAMMER', 'ADMIN', 'PM'] }
        },
        take: 5
    });

    if (pegawais.length === 0) {
        console.log('❌ No pegawai found! Please seed pegawai first.');
        return;
    }

    console.log(`👥 Found ${pegawais.length} pegawai for assignment\n`);

    // Task templates
    const taskTemplates = [
        { prefix: 'Design', desc: 'UI/UX Design', complexity: 'MEDIUM', hours: 8 },
        { prefix: 'Develop', desc: 'Feature Development', complexity: 'HARD', hours: 16 },
        { prefix: 'Test', desc: 'Unit Testing', complexity: 'EASY', hours: 4 },
        { prefix: 'Review', desc: 'Code Review', complexity: 'EASY', hours: 2 },
        { prefix: 'Deploy', desc: 'Deployment', complexity: 'MEDIUM', hours: 6 },
        { prefix: 'Fix', desc: 'Bug Fixing', complexity: 'MEDIUM', hours: 8 },
        { prefix: 'Optimize', desc: 'Performance Optimization', complexity: 'HARD', hours: 12 },
        { prefix: 'Document', desc: 'Documentation', complexity: 'EASY', hours: 4 }
    ];

    const statuses = ['MENUNGGU_PROSES_USER', 'SEDANG_PROSES', 'SELESAI', 'REVIEW_PM'];

    let totalCreated = 0;
    const now = new Date();

    // Buat 3-5 tasks per module
    for (const module of modules) {
        const taskCount = Math.floor(Math.random() * 3) + 3; // 3-5 tasks

        for (let i = 0; i < taskCount; i++) {
            const template = taskTemplates[Math.floor(Math.random() * taskTemplates.length)];
            const pegawai = pegawais[Math.floor(Math.random() * pegawais.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            // Generate dates
            const daysAgo = Math.floor(Math.random() * 30); // 0-30 hari yang lalu
            const scheduleAt = new Date(now);
            scheduleAt.setDate(scheduleAt.getDate() - daysAgo);
            scheduleAt.setHours(8, 0, 0, 0);

            const assigneeStartTaskDeadline = new Date(scheduleAt);
            assigneeStartTaskDeadline.setHours(8, 30, 0, 0);

            const assigneeWorkDeadline = new Date(assigneeStartTaskDeadline);
            assigneeWorkDeadline.setHours(assigneeStartTaskDeadline.getHours() + template.hours, 0, 0, 0);

            const pmReviewDeadline = new Date(assigneeWorkDeadline);
            pmReviewDeadline.setHours(assigneeWorkDeadline.getHours() + 2, 0, 0, 0);

            // Generate kode unik
            const kode = `${module.kode}-${String(totalCreated + 1).padStart(4, '0')}`;

            try {
                await prisma.tasklist.create({
                    data: {
                        projectId: project.id,
                        moduleId: module.id,
                        pegawaiId: pegawai.id,
                        scheduleAt: scheduleAt,
                        status: status,
                        keterangan: `${template.prefix} - ${module.nama}: ${template.desc}`,
                        kode: kode,
                        tasklistType: 'DEVELOPMENT',
                        assigneeStartTaskDeadline: assigneeStartTaskDeadline,
                        assigneeWorkDeadline: assigneeWorkDeadline,
                        pmReviewDeadline: pmReviewDeadline,
                        taskComplexity: template.complexity,
                        programmerDescription: `Working on ${template.desc} for ${module.nama} module`,
                        totalDurationMinutes: status === 'SELESAI' ? template.hours * 60 : 0,
                        startedAt: status !== 'MENUNGGU_PROSES_USER' ? assigneeStartTaskDeadline : null
                    }
                });

                totalCreated++;
                console.log(`✅ Created task: ${kode} - ${template.prefix} ${module.nama} (${template.hours}h) -> ${pegawai.namaLengkap}`);
            } catch (error) {
                console.error(`❌ Failed to create task ${kode}:`, error.message);
            }
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Project: ${project.namaProyek}`);
    console.log(`   Modules: ${modules.length}`);
    console.log(`   Tasks Created: ${totalCreated}`);

    // Hitung total jam
    const totalHours = await calculateTotalHours(project.id);
    console.log(`   Total Hours: ${totalHours.toFixed(2)} hours`);
}

async function calculateTotalHours(projectId) {
    const tasklists = await prisma.tasklist.findMany({
        where: {
            projectId: projectId,
            assigneeStartTaskDeadline: { not: null },
            assigneeWorkDeadline: { not: null }
        },
        select: {
            assigneeStartTaskDeadline: true,
            assigneeWorkDeadline: true
        }
    });

    let totalHours = 0;
    tasklists.forEach(task => {
        if (task.assigneeStartTaskDeadline && task.assigneeWorkDeadline) {
            const diffMs = task.assigneeWorkDeadline.getTime() - task.assigneeStartTaskDeadline.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            totalHours += diffHours;
        }
    });

    return totalHours;
}

async function getNextNoUrut() {
    const lastProject = await prisma.proyek.findFirst({
        orderBy: { noUrut: 'desc' }
    });
    return (lastProject?.noUrut || 0) + 1;
}

// Run the seed
seedTasklistHRIS()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
