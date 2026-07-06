// Simple test to debug the integration issue
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBasicDatabaseConnection() {
  try {
    console.log('Testing basic database connection...');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection successful:', result);
    
    // Test if we can query pegawai table
    const pegawaiCount = await prisma.pegawai.count();
    console.log('Pegawai table count:', pegawaiCount);
    
    // Test if we can query tasklist table
    const tasklistCount = await prisma.tasklist.count();
    console.log('Tasklist table count:', tasklistCount);
    
    // Test creating a simple user
    const testUser = await prisma.pegawai.create({
      data: {
        noUrut: 99999,
        username: 'simple-test-user',
        role: 'PROGRAMMER',
        namaLengkap: 'Simple Test User',
        noHp: '081234567890'
      }
    });
    console.log('Created test user:', testUser.id);
    
    // Clean up
    await prisma.pegawai.delete({
      where: { id: testUser.id }
    });
    console.log('Cleaned up test user');
    
    console.log('All basic tests passed!');
    
  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBasicDatabaseConnection();
