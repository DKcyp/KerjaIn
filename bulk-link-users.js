/**
 * Bulk Link Existing Logbook Users to Portal Users
 * 
 * This script helps you link multiple existing Logbook users to their Portal accounts.
 * 
 * Usage:
 * 1. Update the userMappings array below with your user mappings
 * 2. Get your admin session cookie from browser DevTools
 * 3. Run: node bulk-link-users.js
 */

const fetch = require('node-fetch');

// Configuration
const LOGBOOK_URL = 'http://localhost:3002';
const ADMIN_SESSION_COOKIE = 'YOUR_SESSION_COOKIE_HERE'; // Get from browser DevTools

// User mappings: Logbook ID → Portal User ID
const userMappings = [
  // Example mappings - update these with your actual data
  { logbookId: 1, portalUserId: 'portal-user-id-1', name: 'Admin User' },
  { logbookId: 2, portalUserId: 'portal-user-id-2', name: 'John Doe' },
  { logbookId: 3, portalUserId: 'portal-user-id-3', name: 'Jane Smith' },
  // Add more mappings here...
];

async function linkUser(logbookId, portalUserId, name) {
  try {
    const response = await fetch(`${LOGBOOK_URL}/api/admin/link-portal-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${ADMIN_SESSION_COOKIE}`
      },
      body: JSON.stringify({
        logbookUserId: logbookId,
        portalUserId: portalUserId
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`✅ Linked: ${name} (Logbook ID: ${logbookId})`);
      return { success: true, name };
    } else {
      console.error(`❌ Failed: ${name} - ${result.error}`);
      return { success: false, name, error: result.error };
    }
  } catch (error) {
    console.error(`❌ Error linking ${name}:`, error.message);
    return { success: false, name, error: error.message };
  }
}

async function bulkLinkUsers() {
  console.log('🔗 Starting bulk user linking...\n');
  console.log(`Total users to link: ${userMappings.length}\n`);

  const results = [];

  for (const mapping of userMappings) {
    const result = await linkUser(
      mapping.logbookId,
      mapping.portalUserId,
      mapping.name
    );
    results.push(result);
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successfully linked: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed users:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n✅ Done!');
}

// Validation
if (ADMIN_SESSION_COOKIE === 'YOUR_SESSION_COOKIE_HERE') {
  console.error('❌ Error: Please update ADMIN_SESSION_COOKIE with your actual session cookie');
  console.log('\nHow to get your session cookie:');
  console.log('1. Login to Logbook as SUPER_ADMIN');
  console.log('2. Open DevTools (F12)');
  console.log('3. Go to Application → Cookies');
  console.log('4. Copy the value of "session" cookie');
  console.log('5. Update ADMIN_SESSION_COOKIE in this script');
  process.exit(1);
}

if (userMappings.length === 0 || userMappings[0].portalUserId === 'portal-user-id-1') {
  console.error('❌ Error: Please update userMappings array with your actual user data');
  console.log('\nExample mapping:');
  console.log('{ logbookId: 5, portalUserId: "abc123", name: "John Doe" }');
  process.exit(1);
}

// Run the bulk linking
bulkLinkUsers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
