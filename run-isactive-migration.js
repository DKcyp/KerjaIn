const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    const sql = fs.readFileSync('add-isactive-to-proyek.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await prisma.$executeRawUnsafe(statement);
      }
    }
    
    console.log('✅ Migration successful!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
