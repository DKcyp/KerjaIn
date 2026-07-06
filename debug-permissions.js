// Debug script to check user permissions
const fetch = require('node-fetch');

async function checkPermissions() {
  try {
    console.log('🔍 Checking user permissions...');
    
    // Check current user session
    const meResponse = await fetch('https://log.expressa.id/api/auth/me', {
      credentials: 'include',
      headers: {
        'Cookie': process.env.COOKIE_HEADER || ''
      }
    });
    
    console.log('Me Response Status:', meResponse.status);
    
    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log('Current User:', JSON.stringify(meData, null, 2));
    } else {
      console.log('Me Response Error:', await meResponse.text());
    }
    
    // Check project API
    const projectResponse = await fetch('https://log.expressa.id/api/proyek', {
      credentials: 'include',
      headers: {
        'Cookie': process.env.COOKIE_HEADER || ''
      }
    });
    
    console.log('Project API Status:', projectResponse.status);
    
    if (projectResponse.ok) {
      const projectData = await projectResponse.json();
      console.log('Project Data:', JSON.stringify(projectData, null, 2));
    } else {
      console.log('Project API Error:', await projectResponse.text());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPermissions();
