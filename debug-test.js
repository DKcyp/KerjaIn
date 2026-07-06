const { execSync } = require('child_process');

try {
  console.log('Running single test with detailed output...');
  const output = execSync('npm test -- --testNamePattern="should handle complete start" --verbose --no-coverage --detectOpenHandles', {
    encoding: 'utf8',
    stdio: 'pipe',
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  console.log('SUCCESS OUTPUT:');
  console.log(output);
} catch (error) {
  console.log('=== STDOUT ===');
  console.log(error.stdout || 'No stdout');
  console.log('\n=== STDERR ===');
  console.log(error.stderr || 'No stderr');
  console.log('\n=== ERROR ===');
  console.log('Exit code:', error.status);
  console.log('Signal:', error.signal);
}
