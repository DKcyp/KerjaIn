// Check existing users and assign RBAC roles
// Usage: node scripts/check-and-assign-roles.js

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({ log: ['error', 'warn'] });
  
  try {
    console.log('🔍 Checking existing users...');

    // Get all existing users
    const users = await prisma.pegawai.findMany({
      select: { id: true, username: true, namaLengkap: true, role: true }
    });

    console.log(`Found ${users.length} existing users:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.namaLengkap}) - Role: ${user.role}`);
    });

    console.log('\n🌱 Assigning RBAC roles...');

    // Role mapping from old system to new RBAC system
    const roleMapping = {
      'SUPER_ADMIN': 'super_admin',
      'PM': 'project_manager', 
      'PROGRAMMER': 'developer',
      'ADMIN': 'admin'
    };

    // Get all RBAC roles
    const rbacRoles = await prisma.masterRole.findMany();
    console.log(`Available RBAC roles: ${rbacRoles.map(r => r.name).join(', ')}`);

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

    console.log('\n📊 Final Role Assignments:');
    console.log('----------------------------------------');
    
    // Display final assignments
    const assignments = await prisma.userRole.findMany({
      include: {
        user: { select: { username: true, namaLengkap: true } },
        role: { select: { name: true, displayName: true } }
      }
    });

    if (assignments.length === 0) {
      console.log('No role assignments found.');
    } else {
      assignments.forEach(assignment => {
        console.log(`${assignment.user.username} (${assignment.user.namaLengkap}) → ${assignment.role.displayName}`);
      });
    }

    console.log('----------------------------------------');
    console.log('🎉 Role assignment completed!');
    
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
