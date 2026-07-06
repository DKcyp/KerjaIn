# Testing Setup Guide for Tasklist Time-Tracking

## Overview
This guide provides comprehensive instructions for setting up and running the extensive test suite for the tasklist time-tracking functionality.

## Prerequisites

### 1. Install Testing Dependencies
Add the following dependencies to your `package.json`:

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.5",
    "jest": "^29.7.0",
    "jest-environment-node": "^29.7.0",
    "@babel/preset-env": "^7.22.0",
    "@babel/preset-typescript": "^7.22.0",
    "babel-jest": "^29.7.0"
  },
  "scripts": {
    "test": "node scripts/run-tests.js all",
    "test:unit": "node scripts/run-tests.js unit",
    "test:integration": "node scripts/run-tests.js integration",
    "test:time-tracking": "node scripts/run-tests.js timeTracking",
    "test:coverage": "node scripts/run-tests.js coverage",
    "test:watch": "node scripts/run-tests.js watch"
  }
}
```

### 2. Install Dependencies
```bash
npm install --save-dev @types/jest jest jest-environment-node @babel/preset-env @babel/preset-typescript babel-jest
```

## Test Structure

### File Organization
```
src/
├── app/api/tasklist/[id]/time-tracking/
│   ├── route.ts                    # Main API route
│   ├── route.test.ts              # Unit tests
│   └── integration.test.ts        # Integration tests
├── lib/
│   ├── __tests__/
│   │   └── testUtils.ts           # Test utilities and mocks
│   └── taskTimeTracker.ts         # Business logic
└── docs/
    ├── TASKLIST_TIME_TRACKING_EDGE_CASES.md
    └── TESTING_SETUP_GUIDE.md
```

### Test Categories

#### 1. Unit Tests (`route.test.ts`)
- **Authentication scenarios** - Session validation, unauthorized access
- **Parameter validation** - Invalid task IDs, malformed requests
- **Action validation** - Invalid actions, missing parameters
- **Error handling** - Database errors, timeout scenarios
- **Business logic** - Status transitions, single task constraint
- **Performance** - Response times, concurrent requests

#### 2. Integration Tests (`integration.test.ts`)
- **Complete workflows** - Start → Pause → Resume → Complete
- **Database operations** - Real database interactions
- **Time tracking accuracy** - Duration calculations
- **Concurrent operations** - Multi-user scenarios
- **Error recovery** - Data consistency after failures

#### 3. Test Utilities (`testUtils.ts`)
- **Data factories** - Mock users, tasks, sessions
- **Request builders** - GET/POST request generators
- **Mock implementations** - Database and service mocks
- **Error generators** - Various error scenarios
- **Performance utilities** - Load testing, timing measurements

## Running Tests

### Quick Start
```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run time-tracking specific tests
npm run test:time-tracking

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### Advanced Usage
```bash
# Run specific test file
npx jest src/app/api/tasklist/[id]/time-tracking/route.test.ts

# Run tests matching pattern
npx jest --testNamePattern="authentication"

# Run tests with verbose output
npx jest --verbose

# Run tests in debug mode
npx jest --detectOpenHandles --forceExit
```

## Database Setup for Integration Tests

### 1. Test Database Configuration
Create a separate test database or use the same database with test data isolation:

```bash
# Option 1: Separate test database
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/logbook_test"

# Option 2: Use main database with test data cleanup
export DATABASE_URL="postgresql://user:password@localhost:5432/logbook"
```

### 2. Test Data Management
Integration tests automatically:
- **Setup test data** before running tests
- **Cleanup test data** after tests complete
- **Use unique IDs** (9991-9996) to avoid conflicts
- **Reset state** between test cases

### 3. Manual Test Data Setup
If needed, you can manually setup test data:

```sql
-- Run this SQL to setup test data
INSERT INTO pegawai (id, username, role, namaLengkap, noHp) VALUES 
(9991, 'testuser1', 'PROGRAMMER', 'Test User 1', '081234567890'),
(9992, 'testuser2', 'PM', 'Test User 2', '081234567891');

INSERT INTO tasklist (id, projectId, moduleId, pegawaiId, status, kode, scheduleAt) VALUES
(9991, 1, 1, 9991, 'MENUNGGU_PROSES_USER', 'TEST-001', NOW()),
(9992, 1, 1, 9991, 'SEDANG_DIPROSES_USER', 'TEST-002', NOW()),
(9993, 1, 1, 9991, 'SEDANG_DIPROSES_USER_PAUSED', 'TEST-003', NOW());
```

## Test Coverage

### Coverage Targets
- **Overall coverage**: 70% minimum
- **Time-tracking routes**: 90% minimum
- **Critical business logic**: 95% minimum

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Analysis
The coverage report includes:
- **Line coverage** - Percentage of executed lines
- **Function coverage** - Percentage of called functions
- **Branch coverage** - Percentage of executed branches
- **Statement coverage** - Percentage of executed statements

## Continuous Integration

### GitHub Actions Setup
Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: logbook_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:coverage
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/logbook_test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## Debugging Tests

### Common Issues and Solutions

#### 1. Database Connection Issues
```bash
# Check database connection
npx prisma db push

# Reset database schema
npx prisma migrate reset --force
```

#### 2. Test Timeout Issues
```javascript
// Increase timeout in jest.config.js
module.exports = {
  testTimeout: 60000, // 60 seconds
}

// Or in specific test
jest.setTimeout(60000);
```

#### 3. Memory Leaks
```bash
# Run with memory debugging
npx jest --detectOpenHandles --forceExit

# Check for unclosed database connections
npx jest --detectLeaks
```

#### 4. Mock Issues
```javascript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Reset modules
beforeEach(() => {
  jest.resetModules();
});
```

## Performance Testing

### Load Testing
```javascript
// Example load test
import { PerformanceUtils } from '@/lib/__tests__/testUtils';

test('should handle high load', async () => {
  const results = await PerformanceUtils.loadTest(
    () => makeApiRequest(),
    {
      duration: 30000, // 30 seconds
      requestsPerSecond: 10
    }
  );
  
  expect(results.successfulRequests).toBeGreaterThan(250);
  expect(results.averageResponseTime).toBeLessThan(500);
});
```

### Concurrent Testing
```javascript
// Example concurrent test
test('should handle concurrent requests', async () => {
  const results = await PerformanceUtils.testConcurrentRequests(
    () => makeApiRequest(),
    50 // 50 concurrent requests
  );
  
  expect(results.totalTime).toBeLessThan(5000);
  expect(results.averageTime).toBeLessThan(100);
});
```

## Best Practices

### 1. Test Organization
- **Group related tests** using `describe` blocks
- **Use descriptive test names** that explain the scenario
- **Follow AAA pattern** (Arrange, Act, Assert)
- **Keep tests isolated** and independent

### 2. Mock Strategy
- **Mock external dependencies** (database, APIs, services)
- **Use real implementations** for integration tests
- **Provide realistic mock data** that matches production
- **Reset mocks** between tests

### 3. Error Testing
- **Test all error scenarios** (4xx, 5xx responses)
- **Verify error messages** are user-friendly
- **Test error recovery** and data consistency
- **Include edge cases** and boundary conditions

### 4. Performance Testing
- **Set realistic performance targets**
- **Test under various load conditions**
- **Monitor memory usage** and resource consumption
- **Test concurrent operations**

## Troubleshooting

### Test Failures
1. **Check test output** for specific error messages
2. **Verify database state** before and after tests
3. **Check mock configurations** and return values
4. **Review test data setup** and cleanup

### Performance Issues
1. **Profile test execution** with `--verbose` flag
2. **Check database query performance**
3. **Monitor memory usage** during tests
4. **Optimize test data setup/teardown**

### CI/CD Issues
1. **Verify environment variables** in CI
2. **Check database connectivity** in CI environment
3. **Review CI logs** for specific errors
4. **Test locally** with same configuration

## Maintenance

### Regular Tasks
- **Update test data** when schema changes
- **Review coverage reports** monthly
- **Update mock implementations** when APIs change
- **Refactor tests** to reduce duplication

### Monitoring
- **Track test execution times** over time
- **Monitor coverage trends** and regressions
- **Review failed tests** in CI/CD pipelines
- **Update documentation** when tests change

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Edge Cases Documentation](./TASKLIST_TIME_TRACKING_EDGE_CASES.md)
