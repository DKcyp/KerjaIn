const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Hash password
    const passwordHash = await bcrypt.hash('admin', 10);

    // Get next noUrut
    const lastPegawai = await prisma.pegawai.findFirst({
      orderBy: { noUrut: 'desc' }
    });
    const nextNoUrut = lastPegawai ? lastPegawai.noUrut + 1 : 1;

    // Create admin user
    const admin = await prisma.pegawai.create({
      data: {
        namaLengkap: 'Administrator',
        noHp: '08123456789',
        username: 'admin',
        passwordHash: passwordHash,
        role: 'SUPER_ADMIN',
        noUrut: nextNoUrut
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin');
    console.log('Role: SUPER_ADMIN');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();