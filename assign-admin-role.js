const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignAdminRole() {
  try {
    // Find the admin user
    const adminUser = await prisma.pegawai.findUnique({
      where: { username: 'admin' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    // Find the super_admin role
    const superAdminRole = await prisma.masterRole.findUnique({
      where: { name: 'super_admin' }
    });

    if (!superAdminRole) {
      console.log('❌ Super admin role not found');
      return;
    }

    // Check if user already has the role
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: superAdminRole.id
        }
      }
    });

    if (existingUserRole) {
      console.log('✅ Admin user already has super_admin role');
      return;
    }

    // Assign super_admin role to admin user
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: superAdminRole.id
      }
    });

    console.log('✅ Successfully assigned super_admin role to admin user!');
    console.log(`User: ${adminUser.username} (${adminUser.namaLengkap})`);
    console.log(`Role: ${superAdminRole.displayName}`);

    // Also assign to dummyuser
    const dummyUser = await prisma.pegawai.findUnique({
      where: { username: 'dummyuser' }
    });

    if (dummyUser) {
      const adminRole = await prisma.masterRole.findUnique({
        where: { name: 'admin' }
      });

      if (adminRole) {
        const existingDummyRole = await prisma.userRole.findUnique({
          where: {
            userId_roleId: {
              userId: dummyUser.id,
              roleId: adminRole.id
            }
          }
        });

        if (!existingDummyRole) {
          await prisma.userRole.create({
            data: {
              userId: dummyUser.id,
              roleId: adminRole.id
            }
          });
          console.log('✅ Successfully assigned admin role to dummyuser!');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error assigning roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignAdminRole();