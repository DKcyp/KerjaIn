/**
 * Script untuk generate signed API token
 * Token ini bisa digunakan untuk x-api-key header
 * 
 * Usage:
 * node generate-api-token.js <userId> <role>
 */

const crypto = require('crypto');

const DEFAULT_SECRET = 'dev-secret-change-me';

function getSecret() {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

function signSession(payload, maxAgeSeconds = 60 * 60 * 24 * 365) { // 1 tahun untuk API key
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + maxAgeSeconds;
  const body = { ...payload, iat, exp };
  const json = JSON.stringify(body);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node generate-api-token.js <userId> <role> [namaLengkap] [username]');
  console.log('');
  console.log('Example:');
  console.log('  node generate-api-token.js 4 PROGRAMMER "John Doe" "johndoe"');
  console.log('');
  console.log('Valid roles: SUPER_ADMIN, PM, PROGRAMMER, ADMIN');
  process.exit(1);
}

const userId = parseInt(args[0]);
const role = args[1];
const namaLengkap = args[2] || null;
const username = args[3] || null;

// Validate role
const validRoles = ['SUPER_ADMIN', 'PM', 'PROGRAMMER', 'ADMIN'];
if (!validRoles.includes(role)) {
  console.error(`Error: Invalid role "${role}"`);
  console.error(`Valid roles: ${validRoles.join(', ')}`);
  process.exit(1);
}

// Validate userId
if (isNaN(userId) || userId <= 0) {
  console.error('Error: userId must be a positive number');
  process.exit(1);
}

// Generate token
const payload = {
  id: userId,
  role: role,
  namaLengkap: namaLengkap,
  username: username
};

const token = signSession(payload);

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   RichzLog API Token Generator                         ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');
console.log('Token Details:');
console.log('  User ID:', userId);
console.log('  Role:', role);
console.log('  Nama:', namaLengkap || '(not set)');
console.log('  Username:', username || '(not set)');
console.log('');
console.log('Generated Token:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(token);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Usage Examples:');
console.log('');
console.log('1. cURL with x-api-key:');
console.log(`   curl -H "x-api-key: ${token}" \\`);
console.log('        http://localhost:3000/api/user-activity/daily?userId=4&date=2026-04-07');
console.log('');
console.log('2. cURL with Authorization Bearer:');
console.log(`   curl -H "Authorization: Bearer ${token}" \\`);
console.log('        http://localhost:3000/api/user-activity/daily?userId=4&date=2026-04-07');
console.log('');
console.log('3. Flutter/Dart:');
console.log('   final headers = {');
console.log(`     'x-api-key': '${token}',`);
console.log("     'Content-Type': 'application/json',");
console.log('   };');
console.log('');
console.log('4. JavaScript fetch:');
console.log('   fetch(url, {');
console.log('     headers: {');
console.log(`       'x-api-key': '${token}',`);
console.log("       'Content-Type': 'application/json'");
console.log('     }');
console.log('   });');
console.log('');
console.log('Note: This token is valid for 1 year from generation time.');
console.log('');
