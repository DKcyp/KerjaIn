/**
 * Test script for External Tasklist API with file upload support
 * 
 * This script tests the file upload functionality of the external tasklist API
 * 
 * Usage:
 * 1. Make sure the server is running
 * 2. Set EXTERNAL_API_KEY in .env
 * 3. Run: node test-external-tasklist-files.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.EXTERNAL_API_KEY || 'your-external-api-key-here';

// Test data
const TEST_TASK = {
  projectCode: 'PRJ-001',
  moduleCode: '01.01',
  assigneeUsername: 'admin',
  scheduleAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  description: 'Test task with file uploads',
  taskComplexity: 'MEDIUM',
  tasklistType: 'DEVELOPMENT'
};

// Helper function to create a test file
async function createTestFile(filename, content) {
  const testDir = path.join(__dirname, 'test-uploads');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// Test 1: Create task with single file
async function testSingleFileUpload() {
  console.log('\n📝 Test 1: Create task with single file');
  console.log('='.repeat(60));
  
  try {
    // Create a test file
    const testFile = await createTestFile('test-image.txt', 'This is a test file content');
    
    const formData = new FormData();
    formData.append('projectCode', TEST_TASK.projectCode);
    formData.append('moduleCode', TEST_TASK.moduleCode);
    formData.append('assigneeUsername', TEST_TASK.assigneeUsername);
    formData.append('scheduleAt', TEST_TASK.scheduleAt);
    formData.append('description', TEST_TASK.description);
    formData.append('taskComplexity', TEST_TASK.taskComplexity);
    formData.append('tasklistType', TEST_TASK.tasklistType);
    formData.append('files', fs.createReadStream(testFile));
    
    const response = await fetch(`${API_URL}/api/external/tasklist`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS');
      console.log('Task Code:', result.data.task.code);
      console.log('Uploaded Files:', result.data.task.uploadedFiles.length);
      console.log('File Details:', JSON.stringify(result.data.task.uploadedFiles, null, 2));
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
    }
    
    // Cleanup
    fs.unlinkSync(testFile);
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

// Test 2: Create task with multiple files
async function testMultipleFileUpload() {
  console.log('\n📝 Test 2: Create task with multiple files');
  console.log('='.repeat(60));
  
  try {
    // Create multiple test files
    const testFile1 = await createTestFile('screenshot1.txt', 'Screenshot 1 content');
    const testFile2 = await createTestFile('document.txt', 'Document content');
    const testFile3 = await createTestFile('requirements.txt', 'Requirements content');
    
    const formData = new FormData();
    formData.append('projectCode', TEST_TASK.projectCode);
    formData.append('moduleCode', TEST_TASK.moduleCode);
    formData.append('assigneeUsername', TEST_TASK.assigneeUsername);
    formData.append('scheduleAt', new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());
    formData.append('description', 'Test task with multiple files');
    formData.append('taskComplexity', 'HARD');
    formData.append('files', fs.createReadStream(testFile1));
    formData.append('files', fs.createReadStream(testFile2));
    formData.append('files', fs.createReadStream(testFile3));
    
    const response = await fetch(`${API_URL}/api/external/tasklist`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS');
      console.log('Task Code:', result.data.task.code);
      console.log('Uploaded Files:', result.data.task.uploadedFiles.length);
      result.data.task.uploadedFiles.forEach((file, index) => {
        console.log(`  File ${index + 1}:`, file.originalName, `(${file.fileSize} bytes)`);
      });
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
    }
    
    // Cleanup
    fs.unlinkSync(testFile1);
    fs.unlinkSync(testFile2);
    fs.unlinkSync(testFile3);
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

// Test 3: Create task without files (JSON request)
async function testJSONRequest() {
  console.log('\n📝 Test 3: Create task without files (JSON)');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/api/external/tasklist`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...TEST_TASK,
        scheduleAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        description: 'Test task without files (JSON request)'
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS');
      console.log('Task Code:', result.data.task.code);
      console.log('Uploaded Files:', result.data.task.uploadedFiles.length);
    } else {
      console.log('❌ FAILED');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

// Test 4: Verify API key validation
async function testAPIKeyValidation() {
  console.log('\n📝 Test 4: API key validation');
  console.log('='.repeat(60));
  
  try {
    const response = await fetch(`${API_URL}/api/external/tasklist`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ API key is valid');
      console.log('File upload support:', result.documentation.post.fileUpload.supported);
      console.log('Multiple files:', result.documentation.post.fileUpload.multiple);
    } else {
      console.log('❌ API key validation failed');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('\n🚀 External Tasklist API - File Upload Tests');
  console.log('='.repeat(60));
  console.log('API URL:', API_URL);
  console.log('API Key:', API_KEY.substring(0, 10) + '...');
  
  await testAPIKeyValidation();
  await testJSONRequest();
  await testSingleFileUpload();
  await testMultipleFileUpload();
  
  console.log('\n✨ All tests completed!');
  console.log('='.repeat(60));
  
  // Cleanup test directory
  const testDir = path.join(__dirname, 'test-uploads');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
}

// Run tests
runTests().catch(console.error);
