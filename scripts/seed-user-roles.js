// Seeder to assign users to RBAC roles
// Usage: node scripts/seed-user-roles.js

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({ log: ['error', 'warn'] });
  
  try {
    console.log('🌱 Assigning users to RBAC roles...');

    // Role mapping from old system to new RBAC system
    const roleMapping = {
      'SUPER_ADMIN': 'super_admin',
      'PM': 'project_manager', 
      'PROGRAMMER': 'developer',
      'ADMIN': 'admin'
    };

    // Get all users
    const users = await prisma.pegawai.findMany({
      select: { id: true, username: true, namaLengkap: true, role: true }
    });

    console.log(`Found ${users.length} users to process`);

    // Get all RBAC roles
    const rbacRoles = await prisma.masterRole.findMany();
    console.log(`Found ${rbacRoles.length} RBAC roles`);

    // Process each user
    for (const user of users) {
      const rbacRoleName = roleMapping[user.role];
      
      if (!rbacRoleName) {
        console.log(`⚠️  No RBAC mapping for role: ${user.role} (user: ${user.username})`);
        continue;
      }

      // Find the RBAC role
      const rbacRole = rbacRoles.find(r => r.name === rbacRoleName);
      if (!rbacRole) {
        console.log(`⚠️  RBAC role not found: ${rbacRoleName} (user: ${user.username})`);
        continue;
      }

      // Check if user already has this role assigned
      const existingAssignment = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          roleId: rbacRole.id
        }
      });

      if (existingAssignment) {
        console.log(`✓ User ${user.username} already has role ${rbacRoleName}`);
        continue;
      }

      // Assign role to user
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: rbacRole.id
        }
      });

      console.log(`✅ Assigned ${rbacRoleName} role to ${user.username} (${user.namaLengkap})`);
    }

    // Also create a tester user if it doesn't exist
    const testerExists = await prisma.pegawai.findFirst({
      where: { username: 'tester1' }
    });

    if (!testerExists) {
      const crypto = require('crypto');
      
      // Hash password for tester
      const password = 'tester123';
      const salt = crypto.randomBytes(16);
      const keylen = 64;
      const N = 16384, r = 8, p = 1;
      const derivedKey = crypto.scryptSync(password, salt, keylen, { N, r, p });
      const passwordHash = `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;

      // Get next noUrut
      const max = await prisma.pegawai.aggregate({ _max: { noUrut: true } });
      const nextNoUrut = (max._max.noUrut || 0) + 1;

      // Create tester user
      const testerUser = await prisma.pegawai.create({
        data: {
          noUrut: nextNoUrut,
          namaLengkap: 'Tester User',
          noHp: '081234567895',
          username: 'tester1',
          passwordHash,
          role: 'PROGRAMMER', // Use existing role enum
        }
      });

      // Assign tester RBAC role
      const testerRole = rbacRoles.find(r => r.name === 'tester');
      if (testerRole) {
        await prisma.userRole.create({
          data: {
            userId: testerUser.id,
            roleId: testerRole.id
          }
        });
        console.log(`✅ Created tester user and assigned tester role`);
      }
    }

    console.log('\n🎉 User role assignment completed!');
    console.log('\nUser-Role Assignments:');
    console.log('----------------------------------------');
    
    // Display final assignments
    const assignments = await prisma.userRole.findMany({
      include: {
        user: { select: { username: true, namaLengkap: true } },
        role: { select: { name: true, displayName: true } }
      }
    });

    assignments.forEach(assignment => {
      console.log(`${assignment.user.username} (${assignment.user.namaLengkap}) → ${assignment.role.displayName}`);
    });

    console.log('----------------------------------------');
    
  } catch (e) {
    console.error('❌ Error assigning user roles:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
