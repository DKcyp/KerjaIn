/**
 * Test script for External Project API (No Authentication Required)
 * 
 * Usage:
 *   node test-external-project-api.js
 */

const API_BASE = 'http://localhost:3000/api/external/projects';

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
async function testListProjects() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: List Projects');
  console.log('='.repeat(60));
  
  await apiCall('?page=1&size=5');
}

async function testListProjectsByType() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: List Projects by Type (DEVELOPMENT)');
  console.log('='.repeat(60));
  
  await apiCall('?type=DEVELOPMENT&page=1&size=3');
}

async function testSearchProjects() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Search Projects');
  console.log('='.repeat(60));
  
  await apiCall('?q=sistem&page=1&size=5');
}

async function testCreateProject() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Create Project');
  console.log('='.repeat(60));
  
  const newProject = {
    projectCode: `PRJ-TEST-${Date.now()}`,
    projectName: 'Test Project External API',
    client: 'PT. Test Indonesia',
    pic: 'Test Manager',
    type: 'DEVELOPMENT',
    crmId: 'CRM-TEST-001',
    departmentId: 'DEP-TEST-001',
    departmentName: 'Test Department',
    projectNameCrm: 'Test Project CRM',
    isActive: true
  };
  
  const result = await apiCall('', 'POST', newProject);
  return result.data?.data?.id; // Return created project ID
}

async function testGetProjectById(projectId) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST 5: Get Project by ID (${projectId})`);
  console.log('='.repeat(60));
  
  await apiCall(`/${projectId}`);
}

async function testUpdateProject(projectId) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST 6: Update Project (${projectId})`);
  console.log('='.repeat(60));
  
  const updates = {
    projectName: 'Test Project Updated',
    client: 'PT. Test Updated',
    type: 'SUPPORT',
    isActive: false
  };
  
  await apiCall(`/${projectId}`, 'PUT', updates);
}

async function testDeleteProject(projectId) {
  console.log('\n' + '='.repeat(60));
  console.log(`TEST 7: Delete Project (${projectId})`);
  console.log('='.repeat(60));
  
  await apiCall(`/${projectId}`, 'DELETE');
}

async function testCreateProjectValidation() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 8: Create Project - Validation Error (Missing Required Fields)');
  console.log('='.repeat(60));
  
  const invalidProject = {
    client: 'PT. Test'
    // Missing projectCode and projectName
  };
  
  await apiCall('', 'POST', invalidProject);
}

async function testCreateProjectInvalidType() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 9: Create Project - Invalid Type');
  console.log('='.repeat(60));
  
  const invalidProject = {
    projectCode: 'PRJ-INVALID',
    projectName: 'Invalid Type Project',
    type: 'INVALID_TYPE'
  };
  
  await apiCall('', 'POST', invalidProject);
}

// Main test runner
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       EXTERNAL PROJECT API - TEST SUITE                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n🌐 Base URL: ${API_BASE}`);
  
  try {
    // Test 1-3: Read operations
    await testListProjects();
    await testListProjectsByType();
    await testSearchProjects();
    
    // Test 4-7: CRUD operations
    const createdProjectId = await testCreateProject();
    
    if (createdProjectId) {
      await testGetProjectById(createdProjectId);
      await testUpdateProject(createdProjectId);
      await testDeleteProject(createdProjectId);
    } else {
      console.log('\n⚠️  Skipping update/delete tests - project creation failed');
    }
    
    // Test 8-9: Error cases
    await testCreateProjectValidation();
    await testCreateProjectInvalidType();
    
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
