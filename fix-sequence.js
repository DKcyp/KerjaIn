/**
 * Script untuk fix PostgreSQL sequence
 * Jalankan: node fix-sequence.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSequences() {
  console.log('🔧 Fixing PostgreSQL sequences...\n');

  try {
    // List of tables to fix
    const tables = [
      'pegawai',
      'proyek',
      'user_role',
      'user_permission',
      'master_role',
      'master_permission',
      'proyek_team',
      'blueprint',
      'tasklist',
      'eut_test',
      'uat_test',
      'go_live'
    ];

    for (const table of tables) {
      try {
        console.log(`📝 Fixing ${table} sequence...`);
        
        await prisma.$executeRawUnsafe(`
          SELECT setval(
            pg_get_serial_sequence('${table}', 'id'), 
            COALESCE((SELECT MAX(id) FROM ${table}), 1),
            true
          );
        `);
        
        const seqResult = await prisma.$queryRawUnsafe(`
          SELECT last_value FROM ${table}_id_seq;
        `);
        
        console.log(`   ✅ ${table} sequence set to: ${seqResult[0].last_value}`);
      } catch (err) {
        console.log(`   ⚠️  ${table} - skipped (${err.message})`);
      }
    }

    console.log('\n✅ All sequences fixed successfully!');
    console.log('🎉 You can now create records without ID conflicts.\n');

  } catch (error) {
    console.error('❌ Error fixing sequences:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSequences();
