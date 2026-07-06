#!/usr/bin/env node

/**
 * GitHub Secrets Validation Script
 * 
 * This script helps validate that all required GitHub Secrets are properly configured
 * for the deployment workflow. Run this on your server to check environment variables.
 * 
 * Usage: node scripts/validate-github-secrets.js
 */

const requiredSecrets = [
  // Server Configuration
  { name: 'SERVER_HOST', description: 'Server IP address or domain name' },
  { name: 'SERVER_USER', description: 'SSH username for server access' },
  { name: 'SERVER_SSH_KEY', description: 'Private SSH key content' },
  { name: 'SERVER_DIR', description: 'Application directory path on server' },
  
  // Database Configuration
  { name: 'DATABASE_URL', description: 'PostgreSQL connection string' },
  
  // SSO Configuration
  { name: 'SSO_DASHBOARD_URL', description: 'SSO Dashboard URL' },
  { name: 'NEXT_PUBLIC_SSO_DASHBOARD_URL', description: 'Public SSO Dashboard URL' },
  { name: 'SSO_API_URL', description: 'SSO API URL' },
  { name: 'NEXT_PUBLIC_SSO_API_URL', description: 'Public SSO API URL' },
  { name: 'SSO_CALLBACK_URL', description: 'SSO callback URL' },
  { name: 'NEXT_PUBLIC_SSO_CALLBACK_URL', description: 'Public SSO callback URL' },
  { name: 'NEXT_PUBLIC_APP_URL', description: 'Application public URL' },
  
  // API Keys
  { name: 'EXTERNAL_API_KEY', description: 'External API key for inter-app communication' },
  { name: 'MARKETING_API_KEY', description: 'Marketing system API key' },
  { name: 'MARKETING_API_URL', description: 'Marketing API base URL' },
];

const optionalSecrets = [
  { name: 'SERVER_PORT', description: 'SSH port (defaults to 22)', defaultValue: '22' },
  { name: 'APP_PORT', description: 'Application port (defaults to 3000)', defaultValue: '3000' },
  { name: 'SSO_ENABLED', description: 'Enable SSO (defaults to true)', defaultValue: 'true' },
  { name: 'SSO_BYPASS_FOR_DEV', description: 'Bypass SSO for dev (defaults to false)', defaultValue: 'false' },
  { name: 'SSO_BASE_URL', description: 'Legacy SSO base URL' },
  { name: 'NEXT_PUBLIC_SSO_BASE_URL', description: 'Public legacy SSO base URL' },
  { name: 'MARKETING_BLUEPRINT_ENDPOINT', description: 'Marketing blueprint endpoint', defaultValue: '/contracts/update-status' },
  { name: 'MARKETING_GOLIVE_ENDPOINT', description: 'Marketing go-live endpoint', defaultValue: '/contracts/update-status-development' },
];

function validateEnvironmentVariables() {
  console.log('🔍 Validating GitHub Secrets / Environment Variables...\n');
  
  let missingRequired = [];
  let missingOptional = [];
  let validCount = 0;
  
  // Check required secrets
  console.log('📋 Required Secrets:');
  requiredSecrets.forEach(secret => {
    const value = process.env[secret.name];
    if (value) {
      console.log(`✅ ${secret.name}: Set (${value.length} characters)`);
      validCount++;
    } else {
      console.log(`❌ ${secret.name}: Missing - ${secret.description}`);
      missingRequired.push(secret);
    }
  });
  
  console.log('\n📋 Optional Secrets:');
  optionalSecrets.forEach(secret => {
    const value = process.env[secret.name];
    if (value) {
      console.log(`✅ ${secret.name}: Set (${value.length} characters)`);
      validCount++;
    } else {
      const defaultMsg = secret.defaultValue ? ` (defaults to: ${secret.defaultValue})` : '';
      console.log(`⚠️  ${secret.name}: Not set - ${secret.description}${defaultMsg}`);
      missingOptional.push(secret);
    }
  });
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`✅ Valid secrets: ${validCount}`);
  console.log(`❌ Missing required: ${missingRequired.length}`);
  console.log(`⚠️  Missing optional: ${missingOptional.length}`);
  
  if (missingRequired.length > 0) {
    console.log('\n🚨 Missing Required Secrets:');
    missingRequired.forEach(secret => {
      console.log(`   - ${secret.name}: ${secret.description}`);
    });
    console.log('\n❗ Please add these secrets to your GitHub repository:');
    console.log('   Repository → Settings → Secrets and variables → Actions → New repository secret');
    process.exit(1);
  }
  
  if (missingOptional.length > 0) {
    console.log('\n⚠️  Optional secrets not set (using defaults):');
    missingOptional.forEach(secret => {
      if (secret.defaultValue) {
        console.log(`   - ${secret.name}: Will use default "${secret.defaultValue}"`);
      } else {
        console.log(`   - ${secret.name}: ${secret.description}`);
      }
    });
  }
  
  console.log('\n✅ All required secrets are properly configured!');
  console.log('🚀 Your deployment should work correctly.');
}

function validateDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('❌ DATABASE_URL not set, skipping database validation');
    return;
  }
  
  console.log('\n🗄️  Database URL Validation:');
  try {
    const url = new URL(databaseUrl);
    console.log(`✅ Protocol: ${url.protocol}`);
    console.log(`✅ Host: ${url.hostname}`);
    console.log(`✅ Port: ${url.port || 'default'}`);
    console.log(`✅ Database: ${url.pathname.substring(1)}`);
    console.log(`✅ Username: ${url.username}`);
    console.log(`✅ Password: ${url.password ? '***' : 'not set'}`);
    
    if (url.searchParams.get('schema')) {
      console.log(`✅ Schema: ${url.searchParams.get('schema')}`);
    }
  } catch (error) {
    console.log(`❌ Invalid DATABASE_URL format: ${error.message}`);
  }
}

function validateUrls() {
  console.log('\n🌐 URL Validation:');
  
  const urlSecrets = [
    'SSO_DASHBOARD_URL',
    'NEXT_PUBLIC_SSO_DASHBOARD_URL',
    'SSO_API_URL',
    'NEXT_PUBLIC_SSO_API_URL',
    'SSO_CALLBACK_URL',
    'NEXT_PUBLIC_SSO_CALLBACK_URL',
    'NEXT_PUBLIC_APP_URL',
    'MARKETING_API_URL'
  ];
  
  urlSecrets.forEach(secretName => {
    const value = process.env[secretName];
    if (value) {
      try {
        new URL(value);
        console.log(`✅ ${secretName}: Valid URL format`);
      } catch (error) {
        console.log(`❌ ${secretName}: Invalid URL format - ${value}`);
      }
    }
  });
}

// Main execution
if (require.main === module) {
  console.log('🔧 GitHub Secrets Validation Tool');
  console.log('==================================\n');
  
  validateEnvironmentVariables();
  validateDatabaseConnection();
  validateUrls();
  
  console.log('\n📖 For more information, see: GITHUB_DEPLOYMENT_SETUP.md');
}
