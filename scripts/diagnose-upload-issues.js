const fs = require('fs');
const path = require('path');

async function diagnoseUploadIssues() {
  console.log('🔍 Diagnosing upload issues...\n');
  
  const issues = [];
  const fixes = [];
  
  // 1. Check directory structure
  console.log('1️⃣ Checking directory structure...');
  const requiredDirs = [
    'public',
    'public/uploads', 
    'public/uploads/tasklist'
  ];
  
  for (const dir of requiredDirs) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      issues.push(`❌ Missing directory: ${dir}`);
      fixes.push(`mkdir -p ${dir}`);
    } else {
      console.log(`✅ ${dir} exists`);
    }
  }
  
  // 2. Check permissions
  console.log('\n2️⃣ Checking permissions...');
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
  
  if (fs.existsSync(uploadDir)) {
    try {
      // Test write permission
      const testFile = path.join(uploadDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Directory is writable');
    } catch (e) {
      issues.push('❌ Directory not writable');
      fixes.push('chmod 755 public/uploads/tasklist');
      fixes.push('chown www-data:www-data public/uploads/tasklist (if using nginx/apache)');
    }
  }
  
  // 3. Check disk space
  console.log('\n3️⃣ Checking disk space...');
  try {
    const stats = fs.statSync(process.cwd());
    console.log('✅ Can access file system');
  } catch (e) {
    issues.push('❌ File system access issues');
    fixes.push('Check disk space: df -h');
  }
  
  // 4. Check environment
  console.log('\n4️⃣ Checking environment...');
  console.log(`📍 Working directory: ${process.cwd()}`);
  console.log(`📍 Node version: ${process.version}`);
  console.log(`📍 Platform: ${process.platform}`);
  
  // 5. Check Next.js configuration
  console.log('\n5️⃣ Checking Next.js config...');
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
  if (fs.existsSync(nextConfigPath)) {
    console.log('✅ next.config.ts found');
    // Could check for specific upload configurations
  } else {
    console.log('⚠️ No next.config.ts found (might be okay)');
  }
  
  // 6. Summary
  console.log('\n📋 DIAGNOSIS SUMMARY');
  console.log('===================');
  
  if (issues.length === 0) {
    console.log('✅ No obvious issues found');
    console.log('💡 Upload failures might be due to:');
    console.log('   - Network timeouts');
    console.log('   - Large file sizes');
    console.log('   - Server memory limits');
    console.log('   - Reverse proxy configuration');
  } else {
    console.log('❌ Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
    
    console.log('\n🔧 Suggested fixes:');
    fixes.forEach(fix => console.log(`   ${fix}`));
  }
  
  console.log('\n🧪 Next steps:');
  console.log('1. Deploy and test: /api/debug/test-upload');
  console.log('2. Check server logs during upload attempts');
  console.log('3. Monitor file system during uploads');
  console.log('4. Check reverse proxy settings (nginx/apache)');
}

diagnoseUploadIssues();
