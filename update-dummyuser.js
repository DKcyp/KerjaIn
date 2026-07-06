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

async function updateDummyUser() {
  try {
    // Hash password using scrypt format
    const passwordHash = hashPasswordScrypt('password123');

    // Update dummyuser with scrypt hash
    const updated = await prisma.pegawai.updateMany({
      where: { username: 'dummyuser' },
      data: {
        passwordHash: passwordHash
      }
    });

    if (updated.count > 0) {
      console.log('✅ Dummyuser updated successfully with scrypt hash!');
      console.log('Username: dummyuser');
      console.log('Password: password123');
      console.log('Hash format: scrypt');
    } else {
      console.log('❌ Dummyuser not found');
    }
    
  } catch (error) {
    console.error('❌ Error updating dummyuser:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDummyUser();