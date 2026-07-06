// Create Administrator user directly via Prisma (dev only)
// Usage: node scripts/create_admin.js

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

async function main() {
  const prisma = new PrismaClient({ log: ['error', 'warn'] });
  const namaLengkap = 'Administrator';
  const noHp = '08123123123';
  const username = 'admin';
  const password = '123';
  const role = 'SUPER_ADMIN';

  try {
    // Check existing by username
    const existing = await prisma.pegawai.findFirst({ where: { username } });
    if (existing) {
      console.log('User already exists:', { id: existing.id, username: existing.username });
      return;
    }

    // Next noUrut
    const max = await prisma.pegawai.aggregate({ _max: { noUrut: true } });
    const nextNoUrut = (max._max.noUrut || 0) + 1;

    // scrypt hashing (same as API)
    const salt = crypto.randomBytes(16);
    const keylen = 64;
    const N = 16384, r = 8, p = 1;
    const derivedKey = crypto.scryptSync(password, salt, keylen, { N, r, p });
    const passwordHash = `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;

    const created = await prisma.pegawai.create({
      data: {
        namaLengkap,
        noHp,
        noUrut: nextNoUrut,
        username,
        passwordHash,
        role,
      },
      select: { id: true, noUrut: true, namaLengkap: true, noHp: true, username: true, role: true },
    });

    console.log('Created user:', created);
  } catch (e) {
    console.error('Seed admin error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
