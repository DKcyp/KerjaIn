import { PrismaClient } from '@prisma/client';

const ROMAN: Record<number, string> = {
  0: 'I', 1: 'II', 2: 'III', 3: 'IV', 4: 'V', 5: 'VI',
  6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII',
};

export async function generateTasklistKode(prisma: PrismaClient | any): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = ROMAN[now.getMonth()];
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `${yy}-${mm}-${dd}`;

  const latest = await prisma.tasklist.findFirst({
    where: { kode: { startsWith: prefix } },
    orderBy: { id: 'desc' },
    select: { kode: true },
  });

  let nextSeq = 1;
  if (latest?.kode) {
    const suffix = latest.kode.slice(prefix.length);
    const num = parseInt(suffix, 10);
    if (!isNaN(num)) nextSeq = num + 1;
  }

  return `${prefix}${String(nextSeq).padStart(2, '0')}`;
}
