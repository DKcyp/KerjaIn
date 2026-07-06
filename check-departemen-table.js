const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDepartemenTable() {
  try {
    console.log('🔍 Checking if master_departemen table exists...\n');

    // Check if table exists
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'master_departemen'
    `;

    if (tableCheck.length > 0) {
      console.log('✅ Table master_departemen EXISTS\n');
      
      // Get table structure
      console.log('📋 Table structure:');
      const columns = await prisma.$queryRaw`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'master_departemen'
        ORDER BY ordinal_position
      `;
      
      console.table(columns.map(c => ({
        'Column': c.column_name,
        'Type': c.data_type,
        'Nullable': c.is_nullable,
        'Default': c.column_default || '-'
      })));

      // Check indexes
      console.log('\n📊 Indexes:');
      const indexes = await prisma.$queryRaw`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'master_departemen'
      `;
      
      if (indexes.length > 0) {
        console.table(indexes.map(i => ({
          'Index Name': i.indexname,
          'Definition': i.indexdef
        })));
      } else {
        console.log('No indexes found');
      }

      // Count records
      const count = await prisma.masterDepartemen.count();
      console.log(`\n📈 Total records: ${count}`);

      if (count > 0) {
        console.log('\n📋 Current data:');
        const data = await prisma.masterDepartemen.findMany({
          orderBy: { nama: 'asc' }
        });
        console.table(data.map(d => ({
          'ID': d.id,
          'ID Dep': d.idDep,
          'Nama': d.nama,
          'Active': d.isActive ? '✓' : '✗'
        })));
      }

    } else {
      console.log('❌ Table master_departemen DOES NOT EXIST\n');
      console.log('You need to run the migration first:');
      console.log('  node run-departemen-migration.js\n');
    }

    // Check if pegawai has departemen_id column
    console.log('\n🔍 Checking if pegawai table has departemen_id column...\n');
    
    const pegawaiColumnCheck = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pegawai' 
      AND column_name = 'departemen_id'
    `;

    if (pegawaiColumnCheck.length > 0) {
      console.log('✅ Column departemen_id EXISTS in pegawai table');
      console.table(pegawaiColumnCheck.map(c => ({
        'Column': c.column_name,
        'Type': c.data_type,
        'Nullable': c.is_nullable
      })));

      // Check foreign key constraint
      const fkCheck = await prisma.$queryRaw`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'pegawai'
        AND kcu.column_name = 'departemen_id'
      `;

      if (fkCheck.length > 0) {
        console.log('\n✅ Foreign key constraint exists:');
        console.table(fkCheck.map(fk => ({
          'Constraint': fk.constraint_name,
          'From': `${fk.table_name}.${fk.column_name}`,
          'To': `${fk.foreign_table_name}.${fk.foreign_column_name}`
        })));
      } else {
        console.log('\n⚠️  Foreign key constraint not found');
      }

    } else {
      console.log('❌ Column departemen_id DOES NOT EXIST in pegawai table\n');
      console.log('You need to run the migration first:');
      console.log('  node run-departemen-migration.js\n');
    }

    console.log('\n✅ Check completed!\n');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDepartemenTable();
