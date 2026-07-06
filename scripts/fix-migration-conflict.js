#!/usr/bin/env node

/**
 * Fix Migration Conflict Script
 * 
 * This script resolves the duplicate SlaType enum migration conflict
 * that occurred with migrations 20251007120939_add_master_sla and 20251007121006_add_master_sla
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting migration conflict resolution...');

try {
  // Check if we're in the right directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Error: package.json not found. Please run this script from the project root directory.');
    process.exit(1);
  }

  // Check if the problematic migration exists
  const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', '20251007121006_add_master_sla');
  if (!fs.existsSync(migrationPath)) {
    console.log('✅ Migration 20251007121006_add_master_sla not found. No conflict to resolve.');
    process.exit(0);
  }

  console.log('📋 Step 1: Marking conflicting migration as applied...');
  try {
    execSync('npx prisma migrate resolve --applied 20251007121006_add_master_sla', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Migration marked as applied successfully.');
  } catch (error) {
    console.log('⚠️ Migration resolve failed (this might be expected if already resolved)');
  }

  console.log('📋 Step 2: Running remaining migrations...');
  try {
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ All migrations deployed successfully.');
  } catch (error) {
    console.error('❌ Error deploying migrations:', error.message);
    process.exit(1);
  }

  console.log('📋 Step 3: Generating Prisma Client...');
  try {
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Prisma Client generated successfully.');
  } catch (error) {
    console.error('❌ Error generating Prisma Client:', error.message);
    process.exit(1);
  }

  console.log('🎉 Migration conflict resolved successfully!');
  console.log('');
  console.log('📝 Summary:');
  console.log('- Marked duplicate migration as applied');
  console.log('- Deployed remaining migrations');
  console.log('- Generated fresh Prisma Client');
  console.log('');
  console.log('✅ Your application should now be ready to run.');

} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  console.error('');
  console.error('🔧 Manual steps to resolve:');
  console.error('1. Run: npx prisma migrate resolve --applied 20251007121006_add_master_sla');
  console.error('2. Run: npx prisma migrate deploy');
  console.error('3. Run: npx prisma generate');
  process.exit(1);
}
