/**
 * Setup script for Task Time Tracking feature
 * This script will:
 * 1. Run the database migration to add time tracking fields
 * 2. Regenerate Prisma client
 * 3. Verify the setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Task Time Tracking feature...\n');

// Step 1: Run the database migration
console.log('📊 Running database migration...');
try {
  const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', 'add_task_time_tracking.sql');
  
  if (fs.existsSync(migrationPath)) {
    console.log('✅ Migration file found');
    console.log('⚠️  Please run the following SQL manually in your database:');
    console.log('---');
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    console.log(migrationContent);
    console.log('---\n');
  } else {
    console.log('❌ Migration file not found');
  }
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
}

// Step 2: Regenerate Prisma client
console.log('🔄 Regenerating Prisma client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('✅ Prisma client regenerated successfully\n');
} catch (error) {
  console.error('❌ Error regenerating Prisma client:', error.message);
  process.exit(1);
}

// Step 3: Verify setup
console.log('🔍 Verifying setup...');
try {
  // Check if the new fields are available in the schema
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  const requiredFields = ['startedAt', 'pausedAt', 'totalDurationMinutes', 'isPaused'];
  const missingFields = requiredFields.filter(field => !schemaContent.includes(field));
  
  if (missingFields.length === 0) {
    console.log('✅ All required fields found in schema');
  } else {
    console.log('❌ Missing fields in schema:', missingFields);
  }
  
  // Check if the new status is added
  if (schemaContent.includes('SEDANG_DIPROSES_USER_PAUSED')) {
    console.log('✅ New PAUSED status found in schema');
  } else {
    console.log('❌ PAUSED status not found in schema');
  }
  
} catch (error) {
  console.error('❌ Error verifying setup:', error.message);
}

console.log('\n🎉 Time Tracking setup completed!');
console.log('\n📋 Next steps:');
console.log('1. Run the SQL migration in your database');
console.log('2. Update your frontend to use the new time tracking features');
console.log('3. Test the start/pause/resume/stop functionality');

console.log('\n🔗 API Endpoints available:');
console.log('- GET  /api/tasklist/[id]/time-tracking - Get time info');
console.log('- POST /api/tasklist/[id]/time-tracking - Start/pause/resume/stop');
console.log('- GET  /api/tasklist/active - Get all active tasks');

console.log('\n📚 Usage example:');
console.log('POST /api/tasklist/123/time-tracking');
console.log('{ "action": "start" }  // or "pause", "resume", "stop"');
