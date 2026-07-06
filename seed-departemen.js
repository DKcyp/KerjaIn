const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDepartemen() {
  try {
    console.log('🌱 Seeding Master Departemen from existing data...\n');

    // Ambil semua departemen unik dari tabel proyek
    console.log('📊 Fetching unique departments from proyek table...\n');
    
    const uniqueDepartments = await prisma.$queryRaw`
      SELECT DISTINCT id_dep, dep_nama 
      FROM proyek 
      WHERE id_dep IS NOT NULL 
      AND id_dep != '' 
      AND dep_nama IS NOT NULL
      ORDER BY dep_nama
    `;

    console.log(`Found ${uniqueDepartments.length} unique departments:\n`);
    
    if (uniqueDepartments.length === 0) {
      console.log('⚠️  No departments found in proyek table.');
      console.log('Creating default departments instead...\n');
      
      // Fallback ke departemen default
      const defaultDepts = [
        {
          idDep: 'IT',
          nama: 'Information Technology',
          deskripsi: 'Departemen IT yang menangani pengembangan dan maintenance sistem',
          isActive: true
        },
        {
          idDep: 'HR',
          nama: 'Human Resources',
          deskripsi: 'Departemen SDM yang menangani kepegawaian',
          isActive: true
        },
        {
          idDep: 'FIN',
          nama: 'Finance',
          deskripsi: 'Departemen Keuangan',
          isActive: true
        }
      ];

      for (const dept of defaultDepts) {
        const created = await prisma.masterDepartemen.upsert({
          where: { idDep: dept.idDep },
          update: dept,
          create: dept
        });
        console.log(`✅ Created: ${created.nama} (${created.idDep})`);
      }
    } else {
      // Buat departemen dari data yang ada
      console.log('📝 Creating departemen records...\n');

      for (const dept of uniqueDepartments) {
        try {
          const deptData = {
            idDep: dept.id_dep,
            nama: dept.dep_nama || dept.id_dep,
            deskripsi: `Departemen ${dept.dep_nama || dept.id_dep}`,
            isActive: true
          };

          const created = await prisma.masterDepartemen.upsert({
            where: { idDep: deptData.idDep },
            update: deptData,
            create: deptData
          });
          
          console.log(`✅ Created/Updated: ${created.nama} (${created.idDep})`);
        } catch (error) {
          console.error(`❌ Failed to create ${dept.dep_nama}:`, error.message);
        }
      }
    }

    console.log('\n✅ Seeding completed!\n');

    // Display all departemen
    const allDept = await prisma.masterDepartemen.findMany({
      orderBy: { nama: 'asc' }
    });

    console.log('📊 Current Departemen in database:');
    console.table(allDept.map(d => ({
      ID: d.id,
      'ID Dep': d.idDep,
      'Nama': d.nama,
      'Active': d.isActive ? '✓' : '✗'
    })));

    // Count pegawai per departemen dari proyek
    console.log('\n📈 Analyzing pegawai distribution by department...\n');
    
    try {
      const pegawaiByDept = await prisma.$queryRaw`
        SELECT 
          p.id_dep,
          p.dep_nama,
          COUNT(DISTINCT pt.pegawai_id) as pegawai_count
        FROM proyek p
        LEFT JOIN proyek_team pt ON p.id = pt.project_id
        WHERE p.id_dep IS NOT NULL
        GROUP BY p.id_dep, p.dep_nama
        ORDER BY pegawai_count DESC
      `;

      if (pegawaiByDept.length > 0) {
        console.log('Pegawai count by department (from projects):');
        console.table(pegawaiByDept.map(d => ({
          'ID Dep': d.id_dep,
          'Nama': d.dep_nama,
          'Pegawai Count': Number(d.pegawai_count)
        })));
      }
    } catch (error) {
      console.log('⚠️  Could not analyze pegawai distribution:', error.message);
    }

    console.log('\n💡 Next steps:');
    console.log('1. You can now assign pegawai to departments');
    console.log('2. Use the departemen data in your sistem-monitoring\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDepartemen();
