const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  console.log('\n=== Checking users with "fachrel" in username ===\n');
  
  const users = await prisma.pegawai.findMany({
    where: {
      OR: [
        { username: { contains: 'fachrel' } },
        { namaLengkap: { contains: 'fachrel', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      noUrut: true,
      username: true,
      namaLengkap: true,
      role: true,
      ssoUserId: true,
      portalTenantId: true,
    }
  });

  console.log(`Found ${users.length} user(s):\n`);
  users.forEach((user, idx) => {
    console.log(`User ${idx + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  No Urut: ${user.noUrut}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Nama: ${user.namaLengkap}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  SSO User ID: ${user.ssoUserId || '(not linked)'}`);
    console.log(`  Portal Tenant ID: ${user.portalTenantId || '(not set)'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkUsers().catch(console.error);
