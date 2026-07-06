/**
 * Test script for External User API (No Authentication Required)
 * 
 * Usage:
 *   node test-external-user-api.js
 */

const API_BASE = 'http://localhost:3000/api/external/users';

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  console.log(`\n🔵 ${method} ${url}`);
  if (body) {
    console.log('📤 Request Body:', JSON.stringify(body, null, 2));
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('📥 Response:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { status: 0, error: error.message };
  }
}

// Test functions
async function testListUsers() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: List Users');
  console.log('='.repeat(60));
  
  await apiCall('?page=1&size=5');
}

async function testListUsersByRole() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: List Users by Role (PROGRAMMER)');
  console.log('='.repeat(60));
  
  await apiCall('?role=PROGRAMMER&page=1&size=3');
}

async function testSearchUsers() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Search Users');
  console.log('='.repeat(60));
  
  await apiCall('?q=admin&page=1&size=5');
}

async function testCreateUser() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Create User');
  console.log('='.repeat(60));
  
  const newUser = {
    name: 'Test User External API',
    phone: '08123456789',
    username: `test.user.${Date.now()}`,
    password: 'testPassword123',
    role: 'PROGRAMMER',
    additionalRoles: [] // Add role IDs if you have MasterRole data
  };
  
  const result = await apiCall('', 'POST', newUser);
  return result.data?.data?.id; // Return created user ID
}

async function testGetUserById(userId) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST 5: Get User by ID (${userId})`);
  console.log('='.repeat(60));
  
  await apiCall(`/${userId}`);
}

async function testUpdateUser(userId) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST 6: Update User (${userId})`);
  console.log('='.repeat(60));
  
  const updates = {
    name: 'Test User Updated',
    phone: '08198765432',
    role: 'PM'
  };
  
  await apiCall(`/${userId}`, 'PUT', updates);
}

async function testDeleteUser(userId) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST 7: Delete User (${userId})`);
  console.log('='.repeat(60));
  
  await apiCall(`/${userId}`, 'DELETE');
}

async function testInvalidRole() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 8: Create User - Invalid Role');
  console.log('='.repeat(60));
  
  const invalidUser = {
    username: 'test.invalid'
    // Missing name and phone
  };
  
  await apiCall('', 'POST', invalidUser);
}

async function testCreateUserValidation() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 9: Create User - Validation Error (Missing Required Fields)');
  console.log('='.repeat(60));
  
  const invalidUser = {
    name: 'Test Invalid Role',
    phone: '08123456789',
    role: 'INVALID_ROLE'
  };
  
  await apiCall('', 'POST', invalidUser);
}

// Main test runner
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         EXTERNAL USER API - TEST SUITE                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n🌐 Base URL: ${API_BASE}`);
  
  try {
    // Test 1-3: Read operations
    await testListUsers();
    await testListUsersByRole();
    await testSearchUsers();
    
    // Test 4-7: CRUD operations
    const createdUserId = await testCreateUser();
    
    if (createdUserId) {
      await testGetUserById(createdUserId);
      await testUpdateUser(createdUserId);
      await testDeleteUser(createdUserId);
    } else {
      console.log('\n⚠️  Skipping update/delete tests - user creation failed');
    }
    
    // Test 8-9: Error cases
    await testInvalidRole();
    await testCreateUserValidation();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests
runAllTests();
