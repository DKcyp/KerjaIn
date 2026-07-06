const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Function to verify password using scrypt
function verifyPassword(password, passwordHash) {
  try {
    if (!passwordHash) return false;
    const parts = passwordHash.split('$');
    console.log(`\n🔍 Password Hash Parts: ${parts.length} parts`);
    console.log(`   [0] Algorithm: ${parts[0]}`);
    console.log(`   [1] N: ${parts[1]}`);
    console.log(`   [2] r: ${parts[2]}`);
    console.log(`   [3] p: ${parts[3]}`);
    console.log(`   [4] Salt (hex): ${parts[4]?.substring(0, 20)}...`);
    console.log(`   [5] Key (hex): ${parts[5]?.substring(0, 20)}...`);
    
    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      console.log(`❌ Invalid format! Expected 6 parts with 'scrypt' algorithm`);
      return false;
    }
    
    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], 'hex');
    const key = Buffer.from(parts[5], 'hex');
    
    console.log(`\n🔐 Scrypt Parameters:`);
    console.log(`   N: ${N}`);
    console.log(`   r: ${r}`);
    console.log(`   p: ${p}`);
    console.log(`   Salt length: ${salt.length} bytes`);
    console.log(`   Key length: ${key.length} bytes`);
    
    console.log(`\n🔄 Deriving key from password...`);
    const derived = crypto.scryptSync(password, salt, key.length, { N, r, p });
    
    console.log(`   Derived key (hex): ${derived.toString('hex').substring(0, 20)}...`);
    console.log(`   Stored key (hex):  ${key.toString('hex').substring(0, 20)}...`);
    
    const match = crypto.timingSafeEqual(key, derived);
    console.log(`\n✅ Password match: ${match}`);
    return match;
  } catch (error) {
    console.error(`❌ Error verifying password:`, error.message);
    return false;
  }
}

async function debugLogin() {
  console.log('🔍 DEBUG LOGIN\n');
  console.log('═'.repeat(80));

  try {
    // Get users
    const users = await prisma.pegawai.findMany({
      where: {
        username: {
          in: ['pm_test', 'programmer_test']
        }
      },
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        passwordHash: true,
        role: true
      }
    });

    console.log(`\n📊 Found ${users.length} test users\n`);

    for (const user of users) {
      console.log(`\n👤 User: ${user.username} (${user.namaLengkap})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password Hash: ${user.passwordHash?.substring(0, 50)}...`);

      // Test password verification
      console.log(`\n   Testing password verification with 'password123':`);
      const isValid = verifyPassword('password123', user.passwordHash);
      
      if (isValid) {
        console.log(`   ✅ Password is CORRECT`);
      } else {
        console.log(`   ❌ Password is WRONG`);
      }

      console.log(`\n${'─'.repeat(80)}`);
    }

    console.log('\n═'.repeat(80));
    console.log('\n📝 Summary:');
    console.log('   If password verification shows ✅, login should work');
    console.log('   If password verification shows ❌, there\'s an issue with password hashing');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugLogin();
