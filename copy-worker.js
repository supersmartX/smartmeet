const fs = require('fs');
const path = require('path');

// Source and destination paths
const sourcePath = path.join(__dirname, 'src', 'lib', 'worker.js');
const destDir = path.join(__dirname, '.next', 'server', 'vendor-chunks', 'lib');
const destPath = path.join(destDir, 'worker.js');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy the worker.js file
fs.copyFileSync(sourcePath, destPath);
console.log(`Copied worker.js to ${destPath}`);
