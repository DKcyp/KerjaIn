import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ROMAN: Record<number, string> = {
  0: 'I', 1: 'II', 2: 'III', 3: 'IV', 4: 'V', 5: 'VI',
  6: 'VII', 7: 'VIII', 8: 'IX', 9: 'X', 10: 'XI', 11: 'XII',
};

function formatDatePrefix(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = ROMAN[date.getMonth()];
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

const NEW_KODE_REGEX = /^\d{2}-(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)-\d{4}$/;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    const allTasks = await prisma.tasklist.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, kode: true, createdAt: true, scheduleAt: true },
    });

    const toMigrate = allTasks.filter(t => t.kode && !NEW_KODE_REGEX.test(t.kode));
    const skipped = allTasks.length - toMigrate.length;

    const groups: Record<string, typeof toMigrate> = {};
    for (const task of toMigrate) {
      const date = task.scheduleAt || task.createdAt;
      const prefix = formatDatePrefix(date);
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(task);
    }

    const details: { id: number; old: string | null; new: string }[] = [];

    for (const [prefix, tasks] of Object.entries(groups)) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const seq = String(i + 1).padStart(2, '0');
        const newKode = `${prefix}${seq}`;

        details.push({ id: task.id, old: task.kode, new: newKode });

        if (!dryRun) {
          await prisma.tasklist.update({
            where: { id: task.id },
            data: { kode: newKode },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      totalMigrated: details.length,
      skipped,
      details,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
