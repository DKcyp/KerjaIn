require('dotenv').config({ path: '.env.development' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseUATIssue() {
  try {
    // First, list all projects to find the correct one
    console.log('📋 Available Projects:');
    console.log('='.repeat(80));
    
    const allProjects = await prisma.proyek.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    allProjects.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.kodeProyek} - ${p.namaProyek} (ID: ${p.id})`);
    });
    
    console.log('\n');
    
    // Get project info from the screenshot (try to find by partial match)
    let projectCode = 'PRJ-2025-11-07-SQBS-qweqweqweqwe';
    
    // Try to find project by partial match
    let project = await prisma.proyek.findFirst({
      where: { 
        OR: [
          { kodeProyek: projectCode },
          { kodeProyek: { contains: 'SQBS' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!project && allProjects.length > 0) {
      // Use the most recent project
      project = allProjects[0];
      console.log(`⚠️ Using most recent project: ${project.kodeProyek}`);
    }
    
    if (!project) {
      console.log('❌ No projects found in database!');
      return;
    }
    
    console.log('🔍 Diagnosing UAT Issue for project:', project.kodeProyek);
    console.log('='.repeat(80));
    
    console.log('\n✅ Project found:');
    console.log(`   ID: ${project.id}`);
    console.log(`   Name: ${project.namaProyek}`);
    console.log(`   Type: ${project.type}`);
    
    // 2. Find blueprint
    const blueprint = await prisma.blueprint.findFirst({
      where: { proyekId: project.id }
    });
    
    if (blueprint) {
      console.log('\n📋 Blueprint:');
      console.log(`   ID: ${blueprint.id}`);
      console.log(`   Status: ${blueprint.blueprintStatus}`);
    } else {
      console.log('\n⚠️ No blueprint found');
    }
    
    // 3. Find tasklists
    const tasklists = await prisma.tasklist.findMany({
      where: { projectId: project.id },
      include: {
        module: {
          select: { id: true, nama: true, isLeaf: true, kode: true }
        },
        pegawai: {
          select: { id: true, namaLengkap: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📝 Tasklists (${tasklists.length} total):`);
    tasklists.forEach((task, idx) => {
      console.log(`\n   ${idx + 1}. Task: ${task.kode}`);
      console.log(`      Status: ${task.status}`);
      console.log(`      Type: ${task.tasklistType || 'N/A'}`);
      console.log(`      Module: ${task.module?.nama || 'N/A'} (ID: ${task.moduleId}, isLeaf: ${task.module?.isLeaf})`);
      console.log(`      Assignee: ${task.pegawai?.namaLengkap || 'N/A'}`);
      console.log(`      Description: ${task.keterangan || 'N/A'}`);
    });
    
    // 4. Find blueprint requirements
    if (blueprint) {
      const requirements = await prisma.blueprintRequirement.findMany({
        where: { blueprintId: blueprint.id },
        include: {
          pegawai: {
            select: { id: true, namaLengkap: true }
          }
        }
      });
      
      console.log(`\n📌 Blueprint Requirements (${requirements.length} total):`);
      requirements.forEach((req, idx) => {
        console.log(`\n   ${idx + 1}. Requirement ID: ${req.id}`);
        console.log(`      Status: ${req.status}`);
        console.log(`      Description: ${req.description}`);
        console.log(`      Assigned to: ${req.pegawai?.namaLengkap || 'N/A'}`);
      });
    }
    
    // 5. Find UAT items
    const uatItems = await prisma.uatTest.findMany({
      where: { projectId: project.id },
      include: {
        tester: {
          select: { id: true, namaLengkap: true }
        },
        module: {
          select: { id: true, nama: true, isLeaf: true }
        }
      }
    });
    
    console.log(`\n🧪 UAT Items (${uatItems.length} total):`);
    if (uatItems.length === 0) {
      console.log('   ❌ No UAT items found!');
    } else {
      uatItems.forEach((uat, idx) => {
        console.log(`\n   ${idx + 1}. UAT: ${uat.kode}`);
        console.log(`      Status: ${uat.status}`);
        console.log(`      Feature: ${uat.namaFitur}`);
        console.log(`      Module: ${uat.module?.nama || 'N/A'} (ID: ${uat.moduleId}, isLeaf: ${uat.module?.isLeaf})`);
        console.log(`      Tester: ${uat.tester?.namaLengkap || 'N/A'}`);
      });
    }
    
    // 6. Find modules
    const modules = await prisma.proyekModule.findMany({
      where: { projectId: project.id },
      orderBy: { depth: 'asc' }
    });
    
    console.log(`\n📁 Modules (${modules.length} total):`);
    modules.forEach((mod, idx) => {
      const indent = '  '.repeat(mod.depth);
      console.log(`   ${indent}${idx + 1}. ${mod.nama} (ID: ${mod.id}, isLeaf: ${mod.isLeaf}, kode: ${mod.kode || 'N/A'})`);
    });
    
    // 7. Analysis
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANALYSIS:');
    console.log('='.repeat(80));
    
    const completedTasks = tasklists.filter(t => t.status === 'SELESAI');
    const blueprintTasks = tasklists.filter(t => t.tasklistType === 'BLUEPRINT');
    const doneRequirements = blueprint ? await prisma.blueprintRequirement.count({
      where: { blueprintId: blueprint.id, status: 'DONE' }
    }) : 0;
    
    console.log(`\n✓ Completed tasks (SELESAI): ${completedTasks.length}`);
    console.log(`✓ Blueprint type tasks: ${blueprintTasks.length}`);
    console.log(`✓ DONE requirements: ${doneRequirements}`);
    console.log(`✓ UAT items created: ${uatItems.length}`);
    
    console.log('\n🔍 POTENTIAL ISSUES:');
    
    if (completedTasks.length === 0) {
      console.log('   ⚠️ No tasks have status SELESAI');
      console.log('   → Tasks must go through: MENUNGGU_PROSES_USER → SEDANG_DIPROSES_USER → MENUNGGU_REVIEW_PM → SELESAI');
      console.log('   → UAT is only created when PM approves (status changes to SELESAI)');
    }
    
    if (doneRequirements === 0 && blueprint) {
      console.log('   ⚠️ No blueprint requirements marked as DONE');
      console.log('   → Go to blueprint page and mark requirements as DONE to trigger UAT creation');
    }
    
    if (tasklists.length > 0 && uatItems.length === 0 && completedTasks.length > 0) {
      console.log('   ❌ Tasks are completed but no UAT items created!');
      console.log('   → Check server logs for errors in UAT creation');
      console.log('   → Verify task has tasklistType = BLUEPRINT or DEVELOPMENT');
    }
    
    // Check for non-leaf modules with tasks
    const tasksOnNonLeafModules = tasklists.filter(t => t.module && !t.module.isLeaf);
    if (tasksOnNonLeafModules.length > 0) {
      console.log(`   ⚠️ ${tasksOnNonLeafModules.length} task(s) assigned to parent (non-leaf) modules`);
      console.log('   → UAT items for parent modules will show when you expand the parent in UAT page');
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseUATIssue();
