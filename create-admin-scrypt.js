const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPasswordScrypt(password) {
  const N = 16384; // CPU/memory cost parameter
  const r = 8;     // Block size parameter
  const p = 1;     // Parallelization parameter
  const keylen = 32; // Derived key length
  
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, keylen, { N, r, p });
  
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${key.toString('hex')}`;
}

async function createAdminScrypt() {
  try {
    // Hash password using scrypt format
    const passwordHash = hashPasswordScrypt('admin');

    // Get next noUrut
    const lastPegawai = await prisma.pegawai.findFirst({
      orderBy: { noUrut: 'desc' }
    });
    const nextNoUrut = lastPegawai ? lastPegawai.noUrut + 1 : 1;

    // Delete existing admin if exists
    await prisma.pegawai.deleteMany({
      where: { username: 'admin' }
    });

    // Create admin user with scrypt hash
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

    console.log('✅ Admin user created successfully with scrypt hash!');
    console.log('Username: admin');
    console.log('Password: admin');
    console.log('Role: SUPER_ADMIN');
    console.log('Hash format: scrypt');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminScrypt();