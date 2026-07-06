// Simple test to debug the issue
const { POST } = require('./src/app/api/tasklist/[id]/time-tracking/route.ts');

async function testBasic() {
  try {
    console.log('Testing basic POST functionality...');
    
    // Mock the session
    const mockSession = { user: { id: 9991 } };
    
    // Create a simple request
    const request = {
      json: () => Promise.resolve({ action: 'start' })
    };
    
    const params = Promise.resolve({ id: '9991' });
    
    console.log('Calling POST...');
    const response = await POST(request, { params });
    
    console.log('Response status:', response.status);
    console.log('Response:', await response.text());
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBasic();
