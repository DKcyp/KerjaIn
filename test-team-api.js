// Test script to check if the my-team-members API is working
// Run this in browser console while logged in as PM

async function testTeamMembersAPI() {
  console.log('🧪 Testing /api/master-team/my-team-members...');
  
  try {
    const response = await fetch('/api/master-team/my-team-members', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      console.log('✅ SUCCESS! Found', data.items.length, 'team members');
      console.log('Team members:', data.items);
    } else {
      console.log('❌ FAILED:', data.error || data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ ERROR:', error);
    return null;
  }
}

async function testDebugAPI() {
  console.log('🧪 Testing /api/master-team/debug-teams...');
  
  try {
    const response = await fetch('/api/master-team/debug-teams', {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Debug data:', data);
    
    if (data.success) {
      console.log('✅ Current User:', data.debug.currentUser);
      console.log('✅ User Teams:', data.debug.userTeams);
      console.log('✅ Programmers in My Teams:', data.debug.programmersInMyTeams);
      console.log('✅ All Teams:', data.debug.allTeamsInSystem);
    }
    
    return data;
  } catch (error) {
    console.error('❌ ERROR:', error);
    return null;
  }
}

// Run both tests
console.log('=== Starting API Tests ===');
testDebugAPI().then(() => testTeamMembersAPI());
