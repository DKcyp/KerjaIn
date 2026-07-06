import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const cols = await prisma.$queryRawUnsafe(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'proyek_module'
  ORDER BY ordinal_position
`);
console.log('=== proyek_module columns ===');
cols.forEach(c => console.log(`  ${c.column_name.padEnd(20)} | ${c.data_type.padEnd(30)} | nullable=${c.is_nullable} | default=${c.column_default}`));

// Check FK constraints on proyek_module
const fks = await prisma.$queryRawUnsafe(`
  SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'proyek_module' AND tc.constraint_type = 'FOREIGN KEY'
`);
console.log('\n=== proyek_module FK constraints ===');
fks.forEach(f => console.log(`  ${f.constraint_name}: ${f.column_name} -> ${f.foreign_table}.${f.foreign_column}`));

await prisma.$disconnect();
