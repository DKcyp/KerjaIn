const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPermissions() {
  try {
    console.log('🔍 Testing permissions for admin user...\n');

    // Find admin user
    const adminUser = await prisma.pegawai.findUnique({
      where: { username: 'admin' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        userPermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log(`👤 User: ${adminUser.username} (${adminUser.namaLengkap})`);
    console.log(`🎭 Role: ${adminUser.role}\n`);

    // Show assigned roles
    console.log('📋 Assigned Roles:');
    adminUser.userRoles.forEach(userRole => {
      console.log(`  - ${userRole.role.displayName} (${userRole.role.name})`);
    });

    // Calculate effective permissions
    const effectivePermissions = new Map();

    // Add role-based permissions
    adminUser.userRoles.forEach(userRole => {
      if (userRole.role.isActive) {
        userRole.role.rolePermissions.forEach(rp => {
          if (rp.permission.isActive) {
            effectivePermissions.set(rp.permission.name, true);
          }
        });
      }
    });

    // Apply user-specific overrides
    adminUser.userPermissions.forEach(up => {
      if (up.permission.isActive) {
        effectivePermissions.set(up.permission.name, up.granted);
      }
    });

    // Show effective permissions
    const grantedPermissions = Array.from(effectivePermissions.entries())
      .filter(([_, granted]) => granted)
      .map(([permission, _]) => permission)
      .sort();

    console.log(`\n🔑 Effective Permissions (${grantedPermissions.length}):`);
    grantedPermissions.forEach(permission => {
      console.log(`  ✅ ${permission}`);
    });

    // Check specific permission
    const hasUserRead = grantedPermissions.includes('user.read');
    console.log(`\n🎯 Has 'user.read' permission: ${hasUserRead ? '✅ YES' : '❌ NO'}`);

    if (!hasUserRead) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check if super_admin role has user.read permission');
      console.log('2. Check if user is assigned to super_admin role');
      console.log('3. Check if role and permissions are active');
    }

  } catch (error) {
    console.error('❌ Error testing permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissions();