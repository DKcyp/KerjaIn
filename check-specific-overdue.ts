/**
 * Script untuk cek detail task terlambat programmer tertentu
 * Jalankan dengan: npx tsx check-specific-overdue.ts
 */

import { prisma } from './src/lib/prisma';

async function checkSpecificOverdue() {
  const now = new Date();
  console.log(`🕐 Current time: ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n`);

  // Cek programmer "tes" (ID: 4)
  const programmerId = 4;
  
  const overdueTasks = await prisma.$queryRaw<Array<{
    id: number;
    kode: string;
    status: string;
    scheduleAt: Date;
    assigneeStartTaskDeadline: Date | null;
    assigneeWorkDeadline: Date | null;
    keterangan: string | null;
  }>>`
    SELECT 
      t.id,
      t.kode,
      t.status,
      t."scheduleAt",
      t."assigneeStartTaskDeadline",
      t."assigneeWorkDeadline",
      t.keterangan
    FROM tasklist t
    WHERE t."pegawaiId" = ${programmerId}
      AND (
        (t.status = 'MENUNGGU_PROSES_USER' AND t."assigneeStartTaskDeadline" < ${now})
        OR (t.status = 'SEDANG_DIPROSES_USER' AND t."assigneeWorkDeadline" < ${now})
      )
    ORDER BY t."assigneeStartTaskDeadline"
  `;

  console.log(`📋 Programmer "tes" memiliki ${overdueTasks.length} task terlambat:\n`);

  for (const task of overdueTasks) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 Task: ${task.kode}`);
    console.log(`   Status: ${task.status}`);
    console.log(`   Schedule At: ${task.scheduleAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
    
    if (task.status === 'MENUNGGU_PROSES_USER') {
      console.log(`   ⏰ Deadline Mulai: ${task.assigneeStartTaskDeadline?.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`   🔴 Terlambat karena: Belum mulai padahal deadline mulai sudah lewat`);
    } else if (task.status === 'SEDANG_DIPROSES_USER') {
      console.log(`   ⏰ Deadline Selesai: ${task.assigneeWorkDeadline?.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      console.log(`   🟠 Terlambat karena: Belum selesai padahal deadline kerja sudah lewat`);
    }
    
    if (task.keterangan) {
      console.log(`   📝 Keterangan: ${task.keterangan.substring(0, 100)}...`);
    }
    console.log('');
  }

  // Bandingkan dengan logika LAMA (scheduleAt)
  const oldLogicCount = await prisma.tasklist.count({
    where: {
      pegawaiId: programmerId,
      scheduleAt: { lt: new Date(now.setHours(0, 0, 0, 0)) },
      NOT: {
        OR: [
          { status: 'SELESAI' },
          { status: 'MENUNGGU_REVIEW_PM' }
        ]
      }
    }
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 PERBANDINGAN:`);
  console.log(`   Logika BARU (deadline-based): ${overdueTasks.length} task terlambat`);
  console.log(`   Logika LAMA (scheduleAt-based): ${oldLogicCount} task terlambat`);
  console.log(`\n✅ Perbedaan: ${Math.abs(oldLogicCount - overdueTasks.length)} task`);

  await prisma.$disconnect();
}

checkSpecificOverdue().catch(console.error);
