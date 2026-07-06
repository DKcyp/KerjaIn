const fetch = require('node-fetch');

async function testApiEndpoint() {
  try {
    console.log('🔍 Testing actual API endpoint for task 446...\n');

    // Test the gantt chart API with project ID 14 (HEMS project)
    const url = 'http://localhost:3000/api/gantt-chart-project?projectId=14&from=2020-01-01&to=2030-12-31';
    
    console.log('📡 Making request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.log('❌ API request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return;
    }

    const data = await response.json();
    
    // Find task 446 in the response
    const task446 = data.items?.find(task => task.id === 446);
    
    if (!task446) {
      console.log('❌ Task 446 not found in API response');
      console.log('Available tasks:', data.items?.map(t => t.id).slice(0, 10));
      return;
    }

    console.log('✅ Task 446 found in API response:');
    console.log(JSON.stringify(task446, null, 2));

    console.log('\n🎯 Key fields verification:');
    console.log('   Programmer (pegawaiNama):', task446.pegawaiNama);
    console.log('   Tanggal Realisasi (approvedAt):', task446.approvedAt);
    console.log('   Status:', task446.status);

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testApiEndpoint();