// Environment setup for Jest tests

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Mock environment variables for external services
process.env.MARKETING_API_URL = 'http://localhost:3001'
process.env.MARKETING_API_KEY = 'test-api-key'
process.env.EXTERNAL_API_KEY = 'test-external-key'

// WhatsApp service mock
process.env.WA_API_URL = 'http://localhost:3002'
process.env.WA_API_KEY = 'test-wa-key'

console.log('Jest environment configured for testing')
