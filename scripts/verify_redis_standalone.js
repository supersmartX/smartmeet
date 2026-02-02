const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env manually to avoid dotenv dependency if missing (though it should be there)
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      process.env[key] = value;
    }
  });
}

console.log("Checking Redis Configuration...");

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisUrl = process.env.REDIS_URL;

console.log(`UPSTASH_REDIS_REST_URL: ${upstashUrl ? 'Set' : 'Missing'}`);
console.log(`UPSTASH_REDIS_REST_TOKEN: ${upstashToken ? 'Set' : 'Missing'}`);
console.log(`REDIS_URL: ${redisUrl ? 'Set' : 'Missing'}`);

async function checkUpstash() {
  if (!upstashUrl || !upstashToken) {
    console.log("Skipping Upstash check (missing vars)");
    return false;
  }

  console.log("Testing Upstash Connection via REST...");
  try {
    // Simple REST call to Upstash to ping
    // URL format: https://<id>.upstash.io/ping
    // Auth: Bearer token
    
    // Construct URL: ensure it doesn't end with slash and add /ping
    // Note: Upstash REST URL usually is the base URL.
    const baseUrl = upstashUrl.replace(/\/$/, '');
    // Some Upstash URLs in env might be the redis:// url, but the variable name says REST_URL.
    // Usually it is https://<endpoint>.upstash.io
    
    const fetchUrl = `${baseUrl}/ping`;
    
    // We can use native fetch in Node 18+, or https module
    // Using https for compatibility
    
    return new Promise((resolve) => {
        const url = new URL(fetchUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${upstashToken}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 && data.includes('PONG')) {
                    console.log("✅ Upstash Connection Successful (PONG received)");
                    resolve(true);
                } else {
                    // Try 'set' command if ping isn't standard in their REST API (it usually is)
                    // Actually Upstash REST API is /command/ping or just /ping depending on version
                    // Let's try standard command format: /ping
                    try {
                        const json = JSON.parse(data);
                        if (json.result === 'PONG') {
                             console.log("✅ Upstash Connection Successful (JSON PONG)");
                             resolve(true);
                             return;
                        }
                    } catch (e) {}
                    
                    console.log(`⚠️ Upstash Check Failed: Status ${res.statusCode}, Response: ${data}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`❌ Upstash Connection Error: ${e.message}`);
            resolve(false);
        });

        req.end();
    });

  } catch (error) {
    console.error("Error in Upstash check:", error);
    return false;
  }
}

async function run() {
    let success = false;
    if (upstashUrl) {
        success = await checkUpstash();
    }
    
    if (!success && redisUrl) {
        console.log("Upstash not configured or failed. Checking standard REDIS_URL...");
        // Logic for standard Redis would go here, but avoiding extra dependencies for now.
        // If Upstash is the primary goal, we focus on that.
    }
    
    if (success) {
        console.log("\n✅ Redis Integration Verified.");
        process.exit(0);
    } else {
        console.log("\n❌ Redis Integration Verification Failed.");
        process.exit(1);
    }
}

run();
