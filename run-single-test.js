const { execSync } = require('child_process');

try {
  console.log('Running integration tests...');
  const output = execSync('npm test -- --testNamePattern="Integration Tests" --verbose', {
    encoding: 'utf8',
    stdio: 'pipe',
    cwd: process.cwd()
  });
  console.log('SUCCESS:', output);
} catch (error) {
  console.log('ERROR OUTPUT:');
  console.log(error.stdout);
  console.log('ERROR STDERR:');
  console.log(error.stderr);
  console.log('ERROR MESSAGE:', error.message);
}
