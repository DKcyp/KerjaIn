/**
 * 
 * This script tests the /api/external/projects/sync endpoint
 * to ensure it returns all projects with complete data structure.
 */

const API_BASE_URL = 'http://localhost:3001';
const API_KEY = process.env.CRM_API_KEY || 'logbook-sync-api-key-2024';

async function testProjectsSyncAPI() {
  console.log('🧪 Testing External Projects Sync API');
  console.log('=====================================\n');
  // Test 1: API Key Validation
  console.log('Test 1: API Key Validation');
  console.log('---------------------------');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/external/projects/sync`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
        // No API key - should fail
      }
    });

    if (response.status === 401) {
      console.log('✅ API key validation working - unauthorized access blocked');
    } else {
      console.log('❌ API key validation failed - unauthorized access allowed');
    }
  } catch (error) {
    console.log('❌ Error testing API key validation:', error.message);
  }

  console.log();

  // Test 2: Valid API Request
  console.log('Test 2: Valid API Request');
  console.log('-------------------------');

  try {
    const response = await fetch(`${API_BASE_URL}/api/external/projects/sync`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ API request successful');
      console.log(`📊 Response structure:`);
      console.log(`   - Success: ${data.success}`);
      console.log(`   - Message: ${data.message}`);
      console.log(`   - Timestamp: ${data.timestamp}`);
      console.log(`   - Total Projects: ${data.totalProjects}`);
      console.log(`   - Projects Array Length: ${data.projects?.length || 0}`);

      // Validate data structure
      if (data.projects && data.projects.length > 0) {
        const firstProject = data.projects[0];
        console.log(`\n📋 First Project Structure:`);
        console.log(`   - ID: ${firstProject.id}`);
        console.log(`   - Code: ${firstProject.kodeProyek}`);
        console.log(`   - Name: ${firstProject.namaProyek}`);
        console.log(`   - Team Members: ${firstProject.team?.length || 0}`);
        console.log(`   - Modules: ${firstProject.modules?.length || 0}`);
        
        if (firstProject.stats) {
          console.log(`   - Stats:`);
          console.log(`     * Team Count: ${firstProject.stats.teamCount}`);
          console.log(`     * Module Count: ${firstProject.stats.moduleCount}`);
        }

        // Test simplified team structure
        if (firstProject.team && firstProject.team.length > 0) {
          const firstTeamMember = firstProject.team[0];
          console.log(`\n👥 First Team Member Structure (Simplified):`);
          console.log(`   - Position: ${firstTeamMember.jabatan}`);
          console.log(`   - Username: ${firstTeamMember.username || 'N/A'}`);
          console.log(`   - Full Name: ${firstTeamMember.namaLengkap || 'N/A'}`);
        }

        // Test module structure
        if (firstProject.modules && firstProject.modules.length > 0) {
          const firstModule = firstProject.modules[0];
          console.log(`\n📁 First Module Structure:`);
          console.log(`   - ID: ${firstModule.id}`);
          console.log(`   - Name: ${firstModule.nama}`);
          console.log(`   - Code: ${firstModule.kode}`);
          console.log(`   - Parent ID: ${firstModule.parentId}`);
          console.log(`   - Depth: ${firstModule.depth}`);
          console.log(`   - Is Leaf: ${firstModule.isLeaf}`);
          console.log(`   - Children Count: ${firstModule.children?.length || 0}`);
        }


      } else {
        console.log('ℹ️  No projects found in database');
      }

    } else {
      console.log('❌ API request failed:', response.status, response.statusText);
      const errorData = await response.text();
      console.log('Error details:', errorData);
    }
  } catch (error) {
    console.log('❌ Error making API request:', error.message);
  }

  console.log();

  // Test 3: Documentation Endpoint
  console.log('Test 3: Documentation Endpoint');
  console.log('------------------------------');

  try {
    const response = await fetch(`${API_BASE_URL}/api/external/projects/sync`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Documentation endpoint working');
      console.log(`📖 API Info:`);
      console.log(`   - Message: ${data.message}`);
      console.log(`   - Version: ${data.version}`);
      console.log(`   - Description: ${data.description}`);
      console.log(`   - Available Endpoints: ${Object.keys(data.endpoints || {}).length}`);
    } else {
      console.log('❌ Documentation endpoint failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing documentation endpoint:', error.message);
  }

  console.log();

  // Test 4: Performance Test
  console.log('Test 4: Performance Test');
  console.log('------------------------');

  try {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/api/external/projects/sync`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Performance test completed');
      console.log(`⏱️  Response time: ${responseTime}ms`);
      console.log(`📊 Data size: ${JSON.stringify(data).length} characters`);
      console.log(`🏗️  Projects processed: ${data.totalProjects}`);
      
      if (responseTime < 5000) {
        console.log('✅ Response time acceptable (< 5 seconds)');
      } else {
        console.log('⚠️  Response time slow (> 5 seconds) - consider optimization');
      }
    } else {
      console.log('❌ Performance test failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Error in performance test:', error.message);
  }

  console.log('\n🎉 Testing completed!');
  console.log('====================');
}

// Run tests
if (require.main === module) {
  testProjectsSyncAPI().catch(console.error);
}

module.exports = { testProjectsSyncAPI };
