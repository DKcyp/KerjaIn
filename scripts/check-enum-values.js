#!/usr/bin/env node

/**
 * Script to check current TaskStatus enum values in the database
 */

const { PrismaClient } = require('@prisma/client');

async function checkEnumValues() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking TaskStatus enum values in database...');
    
    // Query to get enum values from PostgreSQL
    const result = await prisma.$queryRaw`
      SELECT enumlabel as value 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'TaskStatus'
      )
      ORDER BY enumsortorder;
    `;
    
    console.log('📋 Current TaskStatus enum values:');
    result.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.value}`);
    });
    
    // Check if SEDANG_DIPROSES_USER_PAUSED exists
    const hasNeededValue = result.some(row => row.value === 'SEDANG_DIPROSES_USER_PAUSED');
    
    if (hasNeededValue) {
      console.log('✅ SEDANG_DIPROSES_USER_PAUSED exists in database');
    } else {
      console.log('❌ SEDANG_DIPROSES_USER_PAUSED is missing from database');
      console.log('💡 Need to add this enum value to fix the API');
    }
    
  } catch (error) {
    console.error('❌ Error checking enum values:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnumValues();
