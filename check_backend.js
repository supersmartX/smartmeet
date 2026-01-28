const http = require('http');

function checkEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supersmartx.com',
      port: 8000,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    console.log(`Checking ${description} (${path})...`);
    
    const req = http.request(options, (res) => {
      console.log(`${description} Status: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`${description} Response: OK`); // Truncate for brevity
          resolve(true);
        } else {
          console.error(`${description} Failed: ${res.statusCode} - ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`${description} Error: ${e.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`${description} Timeout`);
      resolve(false);
    });

    req.end();
  });
}

async function runChecks() {
  const rootOk = await checkEndpoint('/', 'Root Health');
  const modelOk = await checkEndpoint('/model-info', 'Model Info');
  
  if (rootOk && modelOk) {
    console.log('\n✅ Backend is HEALTHY and READY for pipeline.');
    process.exit(0);
  } else {
    console.error('\n❌ Backend checks FAILED.');
    process.exit(1);
  }
}

runChecks();
