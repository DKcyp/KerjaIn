#!/usr/bin/env node

/**
 * Script to regenerate Prisma client
 * Run this if you're having Prisma client issues in production
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Regenerating Prisma client...');

try {
  // Change to project root
  process.chdir(path.join(__dirname, '..'));
  
  console.log('📁 Current directory:', process.cwd());
  
  // Generate Prisma client
  console.log('⚡ Running: prisma generate');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Prisma client regenerated successfully!');
  
  // Optional: Test the client
  console.log('🧪 Testing Prisma client...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  // Simple connection test
  prisma.$connect()
    .then(() => {
      console.log('✅ Prisma client connection test passed!');
      return prisma.$disconnect();
    })
    .catch((error) => {
      console.error('❌ Prisma client connection test failed:', error.message);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Failed to regenerate Prisma client:', error.message);
  process.exit(1);
}
