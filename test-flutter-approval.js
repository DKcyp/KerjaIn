// Test Flutter approval API dengan pm-key-2024
const https = require('https');

const BASE_URL = 'https://log-trial.richz.id';
const API_KEY = 'pm-key-2024';
const TASK_ID = 2384; // Ganti dengan task ID yang valid

// Test dengan berbagai metode autentikasi
const testMethods = [
  {
    name: 'Method 1: Cookie session',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${API_KEY}`,
      'User-Agent': 'Flutter-App/1.0'
    }
  },
  {
    name: 'Method 2: X-API-Key header',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'User-Agent': 'Flutter-App/1.0'
    }
  },
  {
    name: 'Method 3: Authorization Bearer',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'User-Agent': 'Flutter-App/1.0'
    }
  },
  {
    name: 'Method 4: X-Mobile-Token',
    headers: {
      'Content-Type': 'application/json',
      'X-Mobile-Token': API_KEY,
      'User-Agent': 'Flutter-App/1.0'
    }
  }
];

async function testApproval(method) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      status: 'SELESAI',
      keterangan: `Test approval via ${method.name}`
    });

    const options = {
      hostname: 'log-trial.richz.id',
    