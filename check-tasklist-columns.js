const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tasklist' 
      ORDER BY ordinal_position
    `;

    console.log('📋 Tasklist table columns:\n');
    columns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });

    // Check if programmerDescription exists
    const hasProgrammerDesc = columns.some(col => col.column_name === 'programmerDescription');
    
    if (hasProgrammerDesc) {
      console.log('\n✅ Column "programmerDescription" exists');
    } else {
      console.log('\n⚠️  Column "programmerDescription" does NOT exist');
      console.log('   This column needs to be added to the database.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
