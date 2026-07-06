const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicateUser() {
  console.log('\n=== Fixing duplicate fachrel user ===\n');
  
  // Find the duplicate user (username: "fachrel")
  const duplicateUser = await prisma.pegawai.findFirst({
    where: { username: 'fachrel' }
  });

  if (duplicateUser) {
    console.log('Found duplicate user to delete:');
    console.log(`  ID: ${duplicateUser.id}`);
    console.log(`  Username: ${duplicateUser.username}`);
    console.log(`  SSO User ID: ${duplicateUser.ssoUserId}`);
    
    // Delete the duplicate
    await prisma.pegawai.delete({
      where: { id: duplicateUser.id }
    });
    
    console.log('\n✓ Duplicate user deleted');
  } else {
    console.log('No duplicate user found with username "fachrel"');
  }

  // Find the original user (username: "fachrel@exp")
  const originalUser = await prisma.pegawai.findFirst({
    where: { username: 'fachrel@exp' }
  });

  if (originalUser) {
    console.log('\nOriginal user status:');
    console.log(`  ID: ${originalUser.id}`);
    console.log(`  Username: ${originalUser.username}`);
    console.log(`  Current SSO User ID: ${originalUser.ssoUserId || '(not linked)'}`);
    console.log(`  Current Portal Tenant ID: ${originalUser.portalTenantId || '(not set)'}`);
    
    // If you want to unlink the original user so it can be re-linked:
    // Uncomment the following lines:
    /*
    await prisma.pegawai.update({
      where: { id: originalUser.id },
      data: {
        ssoUserId: null,
        portalTenantId: null
      }
    });
    console.log('\n✓ Original user unlinked (ready for re-linking)');
    */
  }

  console.log('\n=== Done ===\n');
  await prisma.$disconnect();
}

fixDuplicateUser().catch(console.error);
