/**
 * Seed dummy users for local testing.
 * Creates: superadmin, pm, programmer — each with password "password123"
 *
 * Usage: node scripts/seed-dummy-users.mjs
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password) {
  const N = 16384, r = 8, p = 1, keyLen = 64;
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, keyLen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${key.toString('hex')}`;
}

const DUMMY_USERS = [
  {
    username: 'superadmin',
    password: 'password123',
    namaLengkap: 'Super Admin Dummy',
    noHp: '081111111111',
    role: 'SUPER_ADMIN',
    masterRoleName: 'super_admin',
  },
  {
    username: 'pm',
    password: 'password123',
    namaLengkap: 'Project Manager Dummy',
    noHp: '081222222222',
    role: 'PM',
    masterRoleName: 'project_manager',
  },
  {
    username: 'programmer',
    password: 'password123',
    namaLengkap: 'Programmer Dummy',
    noHp: '081333333333',
    role: 'PROGRAMMER',
    masterRoleName: 'developer',
  },
];

async function main() {
  // Get next noUrut
  const lastPegawai = await prisma.pegawai.findFirst({
    orderBy: { noUrut: 'desc' },
    select: { noUrut: true },
  });
  let nextNoUrut = lastPegawai ? lastPegawai.noUrut + 1 : 1;

  for (const dummy of DUMMY_USERS) {
    // Check if username already exists
    const existing = await prisma.pegawai.findFirst({
      where: { username: dummy.username },
    });

    if (existing) {
      // Ensure RBAC role is assigned
      const masterRole = await prisma.masterRole.findUnique({
        where: { name: dummy.masterRoleName },
      });
      if (masterRole) {
        const hasRole = await prisma.userRole.findUnique({
          where: { userId_roleId: { userId: existing.id, roleId: masterRole.id } },
        });
        if (!hasRole) {
          await prisma.userRole.create({ data: { userId: existing.id, roleId: masterRole.id } });
          console.log(`Assigned RBAC role '${dummy.masterRoleName}' to existing user '${dummy.username}'`);
        }
      }
      console.log(`User '${dummy.username}' already exists (id=${existing.id}), skipped creation.`);
      continue;
    }

    const passwordHash = hashPassword(dummy.password);

    const user = await prisma.pegawai.create({
      data: {
        noUrut: nextNoUrut++,
        namaLengkap: dummy.namaLengkap,
        noHp: dummy.noHp,
        username: dummy.username,
        passwordHash,
        role: dummy.role,
      },
    });

    // Assign RBAC role
    const masterRole = await prisma.masterRole.findUnique({
      where: { name: dummy.masterRoleName },
    });

    if (masterRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: masterRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: masterRole.id,
        },
      });
    }

    console.log(`Created user '${dummy.username}' (id=${user.id}, role=${dummy.role})`);
  }

  console.log('\nDone! Dummy users created with password: password123');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
