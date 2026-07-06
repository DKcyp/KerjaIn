import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export type LocalUser = {
  id: number;
  noUrut: number;
  username: string | null;
  passwordHash: string | null;
  namaLengkap: string;
  noHp: string;
  role: string;
  departemenId: number | null;
};

/**
 * Verify password against local DB hash (scrypt format).
 */
export function verifyLocalPassword(password: string, hash: string | null | undefined): boolean {
  return verifyPassword(password, hash);
}

/**
 * Fetch user from local DB by username.
 */
export async function getLocalUser(loginname: string): Promise<LocalUser | null> {
  const user = await prisma.pegawai.findFirst({
    where: { username: loginname.toLowerCase() },
    select: {
      id: true,
      noUrut: true,
      username: true,
      passwordHash: true,
      namaLengkap: true,
      noHp: true,
      role: true,
      departemenId: true,
    },
  });

  return user;
}

/**
 * Find Pegawai in local DB by username.
 * Returns the Pegawai record.
 */
export async function findPegawaiByUsername(
  username: string
): Promise<LocalUser | null> {
  return getLocalUser(username);
}
