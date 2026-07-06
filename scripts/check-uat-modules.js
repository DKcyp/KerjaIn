/**
 * Script to check UAT items and module structure for debugging
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUATModules() {
  try {
    console.log('🔍 Checking UAT items and module structure...\n');

    // List all projects first
    const allProjects = await prisma.proyek.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log('📋 Recent Projects:\n');
    allProjects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.kodeProyek} - ${p.namaProyek}`);
    });
    console.log('\n');

    // Get the most recent project
    const project = allProjects[0];

    if (!project) {
      console.log('❌ No projects found');
      return;
    }

    console.log(`📁 Project: ${project.namaProyek} (ID: ${project.id})\n`);

    // Get all modules for this project
    const modules = await prisma.proyekModule.findMany({
      where: {
        projectId: project.id
      },
      orderBy: {
        kode: 'asc'
      }
    });

    console.log(`📊 Total modules: ${modules.length}\n`);

    // Get all UAT items for this project
    const uatItems = await prisma.uatTest.findMany({
      where: {
        projectId: project.id
      },
      include: {
        tester: {
          select: {
            namaLengkap: true
          }
        }
      }
    });

    console.log(`📋 Total UAT items: ${uatItems.length}\n`);

    // Group UAT items by module
    const uatByModule = {};
    uatItems.forEach(item => {
      if (!uatByModule[item.moduleId]) {
        uatByModule[item.moduleId] = [];
      }
      uatByModule[item.moduleId].push(item);
    });

    // Show module structure with UAT status
    console.log('📂 Module Structure with UAT Status:\n');
    
    for (const module of modules) {
      const uatItemsForModule = uatByModule[module.id] || [];
      const approvedCount = uatItemsForModule.filter(item => item.status === 'Approved').length;
      const totalCount = uatItemsForModule.length;
      const approvalRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
      
      const indent = '  '.repeat((module.kode?.split('.').length || 1) - 1);
      const statusIcon = totalCount === 0 ? '⚪' : approvalRate === 100 ? '✅' : '🟡';
      
      console.log(`${indent}${statusIcon} ${module.kode} - ${module.nama}`);
      console.log(`${indent}   Module ID: ${module.id}`);
      console.log(`${indent}   Parent ID: ${module.parentId || 'ROOT'}`);
      console.log(`${indent}   UAT Items: ${totalCount} (${approvedCount} approved, ${approvalRate}%)`);
      
      if (totalCount > 0) {
        uatItemsForModule.forEach(item => {
          console.log(`${indent}     - ${item.kode}: ${item.namaFitur} [${item.status}]`);
        });
      }
      console.log('');
    }

    // Check for modules with 100% UAT approval
    console.log('\n✅ Modules with 100% UAT Approval:\n');
    const fullyApprovedModules = modules.filter(module => {
      const items = uatByModule[module.id] || [];
      if (items.length === 0) return false;
      const approved = items.filter(item => item.status === 'Approved').length;
      return approved === items.length;
    });

    if (fullyApprovedModules.length === 0) {
      console.log('   ⚠️  No modules with 100% UAT approval found');
    } else {
      fullyApprovedModules.forEach(module => {
        console.log(`   ✅ ${module.kode} - ${module.nama} (Module ID: ${module.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUATModules();
