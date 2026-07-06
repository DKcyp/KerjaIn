const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkCorrectUser() {
  console.log('\n=== Linking fachrel@exp to correct Portal user ===\n');
  
  const correctPortalUserId = 'fea08fc9-33be-4133-ac6e-20a9a7b0bc6a';
  const correctTenantId = 'f9023ade-f07a-40c7-a738-e12dc7ae7554';
  
  // Update the original user with correct SSO linking
  const user = await prisma.pegawai.update({
    where: { username: 'fachrel@exp' },
    data: {
      ssoUserId: correctPortalUserId,
      portalTenantId: correctTenantId,
      role: 'PROGRAMMER' // Portal "User" role maps to "PROGRAMMER"
    }
  });

  console.log('✓ User updated successfully:');
  console.log(`  ID: ${user.id}`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Nama: ${user.namaLengkap}`);
  console.log(`  Role: ${user.role}`);
  console.log(`  SSO User ID: ${user.ssoUserId}`);
  console.log(`  Portal Tenant ID: ${user.portalTenantId}`);
  
  console.log('\n✓ User is now correctly linked to Portal!');
  console.log('  You can now sign in to Logbook using Portal SSO.\n');

  await prisma.$disconnect();
}

linkCorrectUser().catch(console.error);
