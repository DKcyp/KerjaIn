#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Tasklist Time-Tracking
 * 
 * This script provides various test running options including:
 * - Unit tests
 * - Integration tests
 * - Coverage reports
 * - Performance tests
 * - Specific test suites
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configurations
const TEST_CONFIGS = {
  unit: {
    pattern: 'src/**/*.test.ts',
    description: 'Run unit tests only'
  },
  integration: {
    pattern: 'src/**/*.integration.test.ts',
    description: 'Run integration tests only'
  },
  timeTracking: {
    pattern: 'src/app/api/tasklist/[id]/time-tracking/*.test.ts',
    description: 'Run time-tracking specific tests'
  },
  all: {
    pattern: 'src/**/*.(test|spec).ts',
    description: 'Run all tests'
  },
  coverage: {
    pattern: 'src/**/*.(test|spec).ts',
    description: 'Run all tests with coverage report',
    extraArgs: ['--coverage']
  },
  watch: {
    pattern: 'src/**/*.(test|spec).ts',
    description: 'Run tests in watch mode',
    extraArgs: ['--watch']
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const extraArgs = args.slice(1);

// Validate test type
if (!TEST_CONFIGS[testType]) {
  console.error(`❌ Invalid test type: ${testType}`);
  console.log('\n📋 Available test types:');
  Object.entries(TEST_CONFIGS).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(15)} - ${config.description}`);
  });
  process.exit(1);
}

// Get test configuration
const config = TEST_CONFIGS[testType];

// Build Jest command
const jestArgs = [
  '--config', 'jest.config.js',
  '--testPathPattern', config.pattern,
  ...(config.extraArgs || []),
  ...extraArgs
];

// Add specific flags based on test type
if (testType === 'integration') {
  jestArgs.push('--runInBand'); // Run integration tests serially
  jestArgs.push('--forceExit'); // Force exit after tests complete
}

if (testType === 'coverage') {
  jestArgs.push('--coverageDirectory', 'coverage');
  jestArgs.push('--coverageReporters', 'text', 'lcov', 'html');
}

console.log(`🚀 Running ${config.description}...`);
console.log(`📁 Pattern: ${config.pattern}`);
console.log(`⚙️  Command: npx jest ${jestArgs.join(' ')}\n`);

// Run Jest
const jest = spawn('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

jest.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Tests completed successfully!');
    
    if (testType === 'coverage') {
      console.log('\n📊 Coverage report generated in ./coverage directory');
      console.log('🌐 Open coverage/lcov-report/index.html in your browser to view detailed coverage');
    }
  } else {
    console.log(`\n❌ Tests failed with exit code ${code}`);
  }
  
  process.exit(code);
});

jest.on('error', (error) => {
  console.error('❌ Failed to start test runner:', error);
  process.exit(1);
});
