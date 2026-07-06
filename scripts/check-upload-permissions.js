const fs = require('fs');
const path = require('path');

async function checkUploadPermissions() {
  try {
    console.log('🔍 Checking upload directory permissions...');
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tasklist');
    console.log(`📁 Upload directory: ${uploadsDir}`);
    
    // Check if directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Upload directory does not exist!');
      console.log('🔧 Creating directory...');
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Directory created');
    } else {
      console.log('✅ Directory exists');
    }
    
    // Check write permissions by creating a test file
    const testFile = path.join(uploadsDir, 'test-write.txt');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Directory is writable');
    } catch (e) {
      console.log('❌ Directory is NOT writable!');
      console.log('Error:', e.message);
      console.log('🔧 Fix with: chmod 755 public/uploads/tasklist');
    }
    
    // Check current permissions
    try {
      const stats = fs.statSync(uploadsDir);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);
      console.log(`📊 Current permissions: ${mode}`);
      
      if (mode !== '755' && mode !== '775') {
        console.log('⚠️ Permissions might be too restrictive');
        console.log('🔧 Recommended: chmod 755 public/uploads/tasklist');
      }
    } catch (e) {
      console.log('⚠️ Could not check permissions:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Permission check failed:', error);
  }
}

checkUploadPermissions();
