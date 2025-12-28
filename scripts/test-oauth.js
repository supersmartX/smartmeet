#!/usr/bin/env node

/**
 * OAuth Configuration Test Script
 * Tests your OAuth setup for production
 */

console.log('🔍 Testing OAuth Configuration for supersmartx.com');
console.log('================================================');

// Test environment variables
const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GITHUB_ID',
  'GITHUB_SECRET'
];

console.log('\n📋 Environment Variables Status:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  const status = value ? (envVar.includes('SECRET') ? 'CONFIGURED (hidden)' : 'CONFIGURED') : 'MISSING';
  console.log(`  ${envVar}: ${status}`);
});

// Test OAuth URLs
const baseUrl = process.env.NEXTAUTH_URL || 'https://supersmartx.com';
console.log('\n🔗 Expected OAuth Callback URLs:');
console.log(`  Google: ${baseUrl}/api/auth/callback/google`);
console.log(`  GitHub: ${baseUrl}/api/auth/callback/github`);

// Test auth providers endpoint
console.log('\n🌐 Testing Auth Providers Endpoint:');
const https = require('https');

const testAuthProviders = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'supersmartx.com',
      path: '/api/auth/providers',
      method: 'GET',
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const providers = JSON.parse(data);
            console.log('✅ Auth providers endpoint working');
            console.log('Available providers:', Object.keys(providers));
            resolve(providers);
          } catch (e) {
            console.log('❌ Invalid JSON response from providers endpoint');
            reject(e);
          }
        } else {
          console.log(`❌ Auth providers endpoint returned ${res.statusCode}`);
          console.log('Response:', data.substring(0, 200));
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Failed to connect to auth providers endpoint');
      console.log('Error:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.log('❌ Connection timeout to auth providers endpoint');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
};

// Run tests
testAuthProviders()
  .then(() => {
    console.log('\n✅ OAuth configuration test completed');
  })
  .catch((err) => {
    console.log('\n❌ OAuth configuration test failed');
    console.log('Error:', err.message);
  });

console.log('\n📝 Next Steps:');
console.log('  1. Update Google OAuth redirect URI in Google Cloud Console');
console.log('  2. Update GitHub OAuth callback URL in GitHub Settings');
console.log('  3. Redeploy to Vercel');
console.log('  4. Test login at https://supersmartx.com/login');