const { execSync } = require('child_process');

try {
  console.log('Running tests with detailed error output...');
  const output = execSync('npm test -- --verbose --no-coverage --maxWorkers=1', {
    encoding: 'utf8',
    stdio: 'pipe',
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 20 // 20MB buffer
  });
  console.log('SUCCESS OUTPUT:');
  console.log(output);
} catch (error) {
  console.log('=== DETAILED ERROR OUTPUT ===');
  if (error.stdout) {
    // Split output into lines and show the last 100 lines for detailed errors
    const lines = error.stdout.split('\n');
    const relevantLines = lines.slice(-150); // Last 150 lines
    console.log(relevantLines.join('\n'));
  }
  
  console.log('\n=== STDERR ===');
  console.log(error.stderr || 'No stderr');
  
  console.log('\n=== SUMMARY ===');
  console.log('Exit code:', error.status);
}
