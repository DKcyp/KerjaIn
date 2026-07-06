/**
 * Script untuk testing User Daily Activity API
 * 
 * Usage:
 * node test-user-activity-api.js
 */

const http = require('http');

// Konfigurasi
const BASE_URL = '192.168.1.16';
const PORT = 3000;
const USER_ID = 6; // Ganti dengan user ID yang valid
const DATE = '2026-03-28'; // Ganti dengan tanggal yang ingin di-test
const SESSION_TOKEN = '172dc4710ab54af8b1b405c89d6de9f0'; // Session token

/**
 * Helper function untuk HTTP request
 */
function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SESSION_TOKEN // Gunakan x-api-key header
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Test 1: Valid request dengan userId dan date
 */
async function testValidRequest() {
  console.log('\n=== Test 1: Valid Request ===');
  console.log(`GET /api/user-activity/daily?userId=${USER_ID}&date=${DATE}`);
  
  try {
    const response = await makeRequest(
      `/api/user-activity/daily?userId=${USER_ID}&date=${DATE}`
    );
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Test PASSED');
      console.log('\nSummary:');
      console.log(response.body.data.summary);
      console.log('\nStatistics:');
      console.log(`- Total Tasks: ${response.body.data.statistics.totalTasks}`);
      console.log(`- Total Activities: ${response.body.data.statistics.totalActivities}`);
      console.log(`- Total Work Minutes: ${response.body.data.statistics.totalWorkMinutes}`);
      
      if (response.body.data.activities.length > 0) {
        console.log('\nFirst Activity:');
        console.log(JSON.stringify(response.body.data.activities[0], null, 2));
      }
    } else {
      console.log('❌ Test FAILED');
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
  }
}

/**
 * Test 2: Missing userId parameter
 */
async function testMissingUserId() {
  console.log('\n=== Test 2: Missing userId Parameter ===');
  console.log(`GET /api/user-activity/daily?date=${DATE}`);
  
  try {
    const response = await makeRequest(
      `/api/user-activity/daily?date=${DATE}`
    );
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 400) {
      console.log('✅ Test PASSED - Correctly rejected missing userId');
      console.log('Error:', response.body.error);
    } else {
      console.log('❌ Test FAILED - Should return 400');
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
  }
}

/**
 * Test 3: Missing date parameter
 */
async function testMissingDate() {
  console.log('\n=== Test 3: Missing date Parameter ===');
  console.log(`GET /api/user-activity/daily?userId=${USER_ID}`);
  
  try {
    const response = await makeRequest(
      `/api/user-activity/daily?userId=${USER_ID}`
    );
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 400) {
      console.log('✅ Test PASSED - Correctly rejected missing date');
      console.log('Error:', response.body.error);
    } else {
      console.log('❌ Test FAILED - Should return 400');
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
  }
}

/**
 * Test 4: Invalid date format
 */
async function testInvalidDateFormat() {
  console.log('\n=== Test 4: Invalid Date Format ===');
  console.log(`GET /api/user-activity/daily?userId=${USER_ID}&date=15-01-2024`);
  
  try {
    const response = await makeRequest(
      `/api/user-activity/daily?userId=${USER_ID}&date=15-01-2024`
    );
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 400) {
      console.log('✅ Test PASSED - Correctly rejected invalid date format');
      console.log('Error:', response.body.error);
    } else {
      console.log('❌ Test FAILED - Should return 400');
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
  }
}

/**
 * Test 5: Invalid userId (non-numeric)
 */
async function testInvalidUserId() {
  console.log('\n=== Test 5: Invalid userId (non-numeric) ===');
  console.log(`GET /api/user-activity/daily?userId=abc&date=${DATE}`);
  
  try {
    const response = await makeRequest(
      `/api/user-activity/daily?userId=abc&date=${DATE}`
    );
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 400) {
      console.log('✅ Test PASSED - Correctly rejected invalid userId');
      console.log('Error:', response.body.error);
    } else {
      console.log('❌ Test FAILED - Should return 400');
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
  }
}

/**
 * Test 6: Date with no activities
 */
async function testNoActivities() {
  console.log('\n=== Test 6: Date with No Activities ===');
  const futureDate = '2025-12-31';
  console.log(`GET /api/user-activity/daily?userId=${USER_ID}&date=${futureDate}`);
  
  try {
    const response = await makeRequest(
      `/api/user-activity/daily?userId=${USER_ID}&date=${futureDate}`
    );
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Test PASSED');
      console.log('\nSummary:');
      console.log(response.body.data.summary);
      
      if (response.body.data.activities.length === 0) {
        console.log('✅ Correctly returned empty activities');
      } else {
        console.log('⚠️  Warning: Expected empty activities');
      }
    } else {
      console.log('❌ Test FAILED');
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
  }
}

/**
 * Test 7: Today's date (dynamic)
 */
async function testTodayDate() {
  console.log('\n=== Test 7: Today\'s Date (Dynamic) ===');
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  console.log(`GET /api/user-activity/daily?userId=${USER_ID}&date=${todayStr}`);
  
  try {
    const response = await makeRequest(
      `/api/user-activity/daily?userId=${USER_ID}&date=${todayStr}`
    );
    
    console.log(`Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Test PASSED');
      console.log('\nSummary:');
      console.log(response.body.data.summary);
    } else {
      console.log('❌ Test FAILED');
      console.log('Response:', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   RichzLog User Daily Activity API - Test Suite       ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\nBase URL: http://${BASE_URL}:${PORT}`);
  console.log(`User ID: ${USER_ID}`);
  console.log(`Test Date: ${DATE}`);
  console.log(`Session Token: ${SESSION_TOKEN ? 'Set' : 'Not Set (may cause auth errors)'}`);
  
  await testValidRequest();
  await testMissingUserId();
  await testMissingDate();
  await testInvalidDateFormat();
  await testInvalidUserId();
  await testNoActivities();
  await testTodayDate();
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Test Suite Completed                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Run tests
runAllTests().catch(console.error);
