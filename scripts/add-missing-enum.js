#!/usr/bin/env node

/**
 * Script to safely add SEDANG_DIPROSES_USER_PAUSED to TaskStatus enum
 */

const { PrismaClient } = require('@prisma/client');

async function addMissingEnumValue() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Adding missing SEDANG_DIPROSES_USER_PAUSED enum value...');
    
    // First check if it already exists
    const existing = await prisma.$queryRaw`
      SELECT enumlabel as value 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'TaskStatus'
      )
      AND enumlabel = 'SEDANG_DIPROSES_USER_PAUSED';
    `;
    
    if (existing.length > 0) {
      console.log('✅ SEDANG_DIPROSES_USER_PAUSED already exists');
      return;
    }
    
    // Add the missing enum value
    console.log('📝 Adding SEDANG_DIPROSES_USER_PAUSED to TaskStatus enum...');
    
    await prisma.$executeRaw`
      ALTER TYPE "TaskStatus" ADD VALUE 'SEDANG_DIPROSES_USER_PAUSED';
    `;
    
    console.log('✅ Successfully added SEDANG_DIPROSES_USER_PAUSED to TaskStatus enum');
    
    // Verify it was added
    const updated = await prisma.$queryRaw`
      SELECT enumlabel as value 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'TaskStatus'
      )
      ORDER BY enumsortorder;
    `;
    
    console.log('📋 Updated TaskStatus enum values:');
    updated.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.value}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding enum value:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️ The enum value already exists, which is fine');
    } else {
      console.error('💡 You may need to run this with database admin privileges');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addMissingEnumValue();
