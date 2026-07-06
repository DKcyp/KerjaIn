const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAndFix() {
  console.log('\n=== Cleaning up duplicate users ===\n');
  
  // Delete all duplicate "fachrel" users (not "fachrel@exp")
  const duplicates = await prisma.pegawai.findMany({
    where: { 
      username: 'fachrel' // Only the duplicates, not "fachrel@exp"
    }
  });

  console.log(`Found ${duplicates.length} duplicate user(s) to delete:`);
  for (const dup of duplicates) {
    console.log(`  - ID: ${dup.id}, Username: ${dup.username}, SSO: ${dup.ssoUserId}`);
    await prisma.pegawai.delete({ where: { id: dup.id } });
  }
  
  if (duplicates.length > 0) {
    console.log(`\n✓ Deleted ${duplicates.length} duplicate user(s)`);
  }

  // Fix the original user - clear the invalid ssoUserId so it can be linked properly
  const originalUser = await prisma.pegawai.findFirst({
    where: { username: 'fachrel@exp' }
  });

  if (originalUser) {
    console.log('\n=== Fixing original user ===');
    console.log(`Current state:`);
    console.log(`  ID: ${originalUser.id}`);
    console.log(`  Username: ${originalUser.username}`);
    console.log(`  SSO User ID: ${originalUser.ssoUserId}`);
    
    // Clear the invalid ssoUserId so the linking logic can work
    await prisma.pegawai.update({
      where: { id: originalUser.id },
      data: {
        ssoUserId: null,
        portalTenantId: null
      }
    });
    
    console.log('\n✓ Cleared SSO fields - user is ready for linking');
    console.log('  Now try signing in via Portal SSO again');
  }

  console.log('\n=== Done ===\n');
  await prisma.$disconnect();
}

cleanupAndFix().catch(console.error);
