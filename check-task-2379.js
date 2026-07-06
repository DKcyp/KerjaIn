const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTask() {
  try {
    const task = await prisma.tasklist.findUnique({
      where: { id: 2379 },
      include: {
        project: true,
        pegawai: true,
        creator: true,
      }
    });

    if (!task) {
      console.log('❌ Task 2379 not found');
      return;
    }

    console.log('\n📋 Task 2379 Details:');
    console.log('Status:', task.status);
    console.log('Project ID:', task.projectId);
    console.log('Project Name:', task.project?.namaProyek);
    console.log('Assigned to (pegawaiId):', task.pegawaiId, '-', task.pegawai?.namaLengkap);
    console.log('Created by:', task.createdBy, '-', task.creator?.namaLengkap);

    // Check creator's role in project
    if (task.createdBy) {
      const creatorTeam = await prisma.proyekTeam.findFirst({
        where: {
          projectId: task.projectId,
          pegawaiId: task.createdBy,
        },
      });

      console.log('\n👤 Creator Team Info:');
      console.log('Jabatan:', creatorTeam?.jabatan);
      console.log('Team Source:', creatorTeam?.teamSource);
      console.log('Is PM/PIC:', creatorTeam?.jabatan?.toUpperCase().includes('PM') || creatorTeam?.jabatan?.toUpperCase().includes('PIC'));
    }

    // Check if API key user (id=1) is in project team
    const apiKeyUserTeam = await prisma.proyekTeam.findFirst({
      where: {
        projectId: task.projectId,
        pegawaiId: 1,
      },
    });

    console.log('\n🔑 API Key User (id=1) in Project:');
    if (apiKeyUserTeam) {
      console.log('✅ Found in team');
      console.log('Jabatan:', apiKeyUserTeam.jabatan);
      console.log('Team Source:', apiKeyUserTeam.teamSource);
    } else {
      console.log('❌ NOT in project team');
      console.log('⚠️  This is why approval fails - API key user must be in project team or be the creator');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTask();
