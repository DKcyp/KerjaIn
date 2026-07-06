// Seed sample project, module (leaf), and team memberships
// Usage: node scripts/seed_projects.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding project, module, and team...');

  // Ensure baseline users exist (from seed_pegawai.js)
  const admin = await prisma.pegawai.findFirst({ where: { username: 'admin' } });
  const pm = await prisma.pegawai.findFirst({ where: { username: 'pm1' } });
  const programmer1 = await prisma.pegawai.findFirst({ where: { username: 'programmer1' } });
  const programmer2 = await prisma.pegawai.findFirst({ where: { username: 'programmer2' } });
  if (!pm || !programmer1) {
    throw new Error('Missing baseline users. Run: node scripts/seed_pegawai.js');
  }

  // Create or reuse project safely (respect unique noUrut)
  let proyek = await prisma.proyek.findUnique({ where: { kodeProyek: 'ALPHA' } });
  if (!proyek) {
    const agg = await prisma.proyek.aggregate({ _max: { noUrut: true } });
    const next = (agg._max.noUrut ?? 0) + 1;
    proyek = await prisma.proyek.create({
      data: {
        noUrut: next,
        kodeProyek: 'ALPHA',
        namaProyek: 'Proyek Alpha',
      },
    });
  }

  // Create a simple module tree: root leaf module
  let modul = await prisma.proyekModule.findFirst({ where: { projectId: proyek.id, nama: 'Modul Utama' } });
  if (!modul) {
    modul = await prisma.proyekModule.create({
      data: {
        projectId: proyek.id,
        parentId: null,
        nama: 'Modul Utama',
        order: 1,
        depth: 0,
        isLeaf: true,
      },
    });
  }

  // Team members (PM + Programmer)
  await prisma.proyekTeam.upsert({
    where: { projectId_pegawaiId: { projectId: proyek.id, pegawaiId: pm.id } },
    update: {},
    create: { projectId: proyek.id, pegawaiId: pm.id, jabatan: 'PM' },
  });
  await prisma.proyekTeam.upsert({
    where: { projectId_pegawaiId: { projectId: proyek.id, pegawaiId: programmer1.id } },
    update: {},
    create: { projectId: proyek.id, pegawaiId: programmer1.id, jabatan: 'PROGRAMMER' },
  });
  if (programmer2) {
    await prisma.proyekTeam.upsert({
      where: { projectId_pegawaiId: { projectId: proyek.id, pegawaiId: programmer2.id } },
      update: {},
      create: { projectId: proyek.id, pegawaiId: programmer2.id, jabatan: 'PROGRAMMER' },
    });
  }

  console.log('Seeded:\n- Project:', proyek.namaProyek, `(#${proyek.id})`);
  console.log('- Module:', modul.nama, `(#${modul.id})`);
  console.log('- Team members added for PM and Programmer1' + (programmer2 ? ' and Programmer2' : ''));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
