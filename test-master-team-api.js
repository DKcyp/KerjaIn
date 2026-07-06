// Test script untuk Master Team API
// Jalankan dengan: node test-master-team-api.js

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing Master Team API...\n');

  try {
    // Test 1: Get available projects
    console.log('1️⃣ Testing GET /api/master-team/available-projects');
    const projectsRes = await fetch(`${BASE_URL}/api/master-team/available-projects`);
    const projectsData = await projectsRes.json();
    console.log('✅ Available projects:', projectsData.success ? `${projectsData.items?.length || 0} projects found` : 'Failed');
    console.log('Projects:', projectsData.items?.slice(0, 3).map(p => `${p.kodeProyek} - ${p.namaProyek}`));
    console.log('');

    // Test 2: Get all teams
    console.log('2️⃣ Testing GET /api/master-team');
    const teamsRes = await fetch(`${BASE_URL}/api/master-team`);
    const teamsData = await teamsRes.json();
    console.log('✅ Teams:', teamsData.success ? `${teamsData.items?.length || 0} teams found` : 'Failed');
    console.log('Teams:', teamsData.items?.map(t => `${t.namaTeam} (${t.projects?.length || 0} projects)`));
    console.log('');

    // Test 3: Create new team
    console.log('3️⃣ Testing POST /api/master-team');
    const newTeamData = {
      namaTeam: 'Test Team API',
      deskripsi: 'Tim untuk testing API',
      projects: []
    };

    const createRes = await fetch(`${BASE_URL}/api/master-team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTeamData)
    });
    const createData = await createRes.json();
    console.log('✅ Create team:', createData.success ? 'Success' : `Failed: ${createData.error}`);
    
    if (createData.success) {
      const teamId = createData.item.id;
      console.log('Created team ID:', teamId);
      
      // Test 4: Update team
      console.log('\n4️⃣ Testing PUT /api/master-team/' + teamId);
      const updateData = {
        namaTeam: 'Updated Test Team',
        deskripsi: 'Tim yang sudah diupdate',
        projects: []
      };

      const updateRes = await fetch(`${BASE_URL}/api/master-team/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const updateResult = await updateRes.json();
      console.log('✅ Update team:', updateResult.success ? 'Success' : `Failed: ${updateResult.error}`);

      // Test 5: Delete team
      console.log('\n5️⃣ Testing DELETE /api/master-team/' + teamId);
      const deleteRes = await fetch(`${BASE_URL}/api/master-team/${teamId}`, {
        method: 'DELETE'
      });
      const deleteResult = await deleteRes.json();
      console.log('✅ Delete team:', deleteResult.success ? 'Success' : `Failed: ${deleteResult.error}`);
    }

    console.log('\n🎉 API Testing completed!');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Run tests
testAPI();