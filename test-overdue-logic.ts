/**
 * Script untuk test logika task terlambat
 * Jalankan dengan: npx tsx test-overdue-logic.ts
 */

import { prisma } from './src/lib/prisma';

async function testOverdueLogic() {
  console.log('🔍 Testing Overdue Task Logic...\n');
  
  const now = new Date();
  console.log(`Current time: ${now.toISOString()}\n`);

  // Get overdue tasks based on NEW logic
  const overdueTasks = await prisma.$queryRaw<Array<{
    id: number;
    kode: string;
    status: string;
    pegawaiId: number;
    pegawaiNama: string;
    assigneeStartTaskDeadline: Date | null;
    assigneeWorkDeadline: Date | null;
  }>>`
    SELECT 
      t.id,
      t.kode,
      t.status,
      t."pegawaiId",
      p."namaLengkap" as "pegawaiNama",
      t."assigneeStartTaskDeadline",
      t."assigneeWorkDeadline"
    FROM tasklist t
    JOIN pegawai p ON t."pegawaiId" = p.id
    WHERE (
      (t.status = 'MENUNGGU_PROSES_USER' AND t."assigneeStartTaskDeadline" < ${now})
      OR (t.status = 'SEDANG_DIPROSES_USER' AND t."assigneeWorkDeadline" < ${now})
    )
    ORDER BY p."namaLengkap", t."assigneeStartTaskDeadline"
  `;

  console.log(`📊 Found ${overdueTasks.length} overdue tasks:\n`);

  // Group by programmer
  const byProgrammer = new Map<number, Array<typeof overdueTasks[0]>>();
  for (const task of overdueTasks) {
    const tasks = byProgrammer.get(task.pegawaiId) || [];
    tasks.push(task);
    byProgrammer.set(task.pegawaiId, tasks);
  }

  // Display results
  for (const [pegawaiId, tasks] of byProgrammer) {
    const programmer = tasks[0].pegawaiNama;
    console.log(`👤 ${programmer} - ${tasks.length} task terlambat:`);
    
    for (const task of tasks) {
      const deadline = task.status === 'MENUNGGU_PROSES_USER' 
        ? task.assigneeStartTaskDeadline 
        : task.assigneeWorkDeadline;
      
      const statusText = task.status === 'MENUNGGU_PROSES_USER'
        ? '🔴 Belum mulai'
        : '🟠 Sedang dikerjakan';
      
      console.log(`   ${task.kode} - ${statusText}`);
      console.log(`   Deadline: ${deadline?.toISOString()}`);
      console.log('');
    }
  }

  await prisma.$disconnect();
}

testOverdueLogic().catch(console.error);
