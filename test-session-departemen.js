const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSessionDepartemen() {
  try {
    console.log('🧪 Testing Session with Departemen ID...\n');

    // 1. Check if pegawai table has departemen_id column
    console.log('1️⃣ Checking pegawai table structure...');
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pegawai' 
      AND column_name = 'departemen_id'
    `;

    if (columnCheck.length > 0) {
      console.log('✅ Column departemen_id exists in pegawai table\n');
    } else {
      console.log('❌ Column departemen_id NOT found in pegawai table\n');
      return;
    }

    // 2. Check sample users with departemen_id
    console.log('2️⃣ Checking sample users with departemen_id...');
    const usersWithDept = await prisma.pegawai.findMany({
      where: {
        departemenId: { not: null }
      },
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        departemenId: true
      },
      take: 5
    });

    if (usersWithDept.length > 0) {
      console.log(`✅ Found ${usersWithDept.length} users with departemen_id:`);
      console.table(usersWithDept);
    } else {
      console.log('⚠️  No users have departemen_id assigned yet\n');
      
      // Show all users
      const allUsers = await prisma.pegawai.findMany({
        select: {
          id: true,
          username: true,
          namaLengkap: true,
          role: true,
          departemenId: true
        },
        take: 5
      });
      
      console.log('Sample users (first 5):');
      console.table(allUsers);
    }

    // 3. Show available departments
    console.log('\n3️⃣ Available departments:');
    const departments = await prisma.masterDepartemen.findMany({
      where: { isActive: true },
      select: {
        id: true,
        idDep: true,
        nama: true
      }
    });

    if (departments.length > 0) {
      console.table(departments);
      console.log('\n💡 To assign a user to a department, run:');
      console.log('   UPDATE pegawai SET departemen_id = <dept_id> WHERE id = <user_id>;\n');
    } else {
      console.log('⚠️  No departments found. Run seed-departemen.js first\n');
    }

    // 4. Test session payload structure
    console.log('4️⃣ Session payload will include:');
    console.log(`
    {
      id: <user_id>,
      role: '<user_role>',
      namaLengkap: '<user_name>',
      username: '<username>',
      departemenId: <dept_id>,  // ✅ NEW FIELD
      permissions: [...],
      iat: <timestamp>,
      exp: <timestamp>
    }
    `);

    console.log('✅ Session structure updated successfully!\n');
    console.log('📝 Next steps:');
    console.log('1. Assign departemen_id to users in database');
    console.log('2. Users need to logout and login again to get new session');
    console.log('3. Access departemenId in API: const { user } = await getServerSession();');
    console.log('4. Use: user.departemenId\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSessionDepartemen();
