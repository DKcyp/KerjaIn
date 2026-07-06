const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateUsersToRBAC() {
  console.log('🔄 Migrating existing users to RBAC system...');

  // Role mapping from existing enum to RBAC roles
  const roleMapping = {
    'SUPER_ADMIN': 'super_admin',
    'PM': 'project_manager', 
    'ADMIN': 'admin',
    'PROGRAMMER': 'developer'
  };

  try {
    // Get all users
    const users = await prisma.pegawai.findMany({
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true
      }
    });

    console.log(`Found ${users.length} users to migrate`);

    // Get all RBAC roles
    const rbacRoles = await prisma.masterRole.findMany();
    const roleMap = {};
    rbacRoles.forEach(role => {
      roleMap[role.name] = role.id;
    });

    let migratedCount = 0;

    for (const user of users) {
      const rbacRoleName = roleMapping[user.role];
      
      if (!rbacRoleName) {
        console.log(`⚠️  No RBAC mapping found for role: ${user.role} (user: ${user.username})`);
        continue;
      }

      const rbacRoleId = roleMap[rbacRoleName];
      
      if (!rbacRoleId) {
        console.log(`⚠️  RBAC role not found: ${rbacRoleName} (user: ${user.username})`);
        continue;
      }

      // Check if user already has this role assigned
      const existingAssignment = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: rbacRoleId
          }
        }
      });

      if (existingAssignment) {
        console.log(`✓ User ${user.username} already has ${rbacRoleName} role`);
        continue;
      }

      // Assign the RBAC role to the user
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: rbacRoleId
        }
      });

      console.log(`✅ Assigned ${rbacRoleName} role to ${user.username} (${user.namaLengkap})`);
      migratedCount++;
    }

    console.log(`🎉 Migration completed! ${migratedCount} users migrated to RBAC system.`);

    // Show summary
    console.log('\n📊 Migration Summary:');
    for (const [oldRole, newRole] of Object.entries(roleMapping)) {
      const userCount = users.filter(u => u.role === oldRole).length;
      if (userCount > 0) {
        console.log(`   ${oldRole} → ${newRole}: ${userCount} users`);
      }
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateUsersToRBAC();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
