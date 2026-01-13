/* eslint-disable @typescript-eslint/no-require-imports */
const { parentPort } = require('worker_threads');

// Basic worker thread implementation for Next.js
if (parentPort) {
  parentPort.on('message', (message) => {
    try {
      // Handle different types of messages
      if (message.type === 'log') {
        // Handle logging messages (likely from pino/thread-stream)
        process.stdout.write(message.data + '\n');
      } else if (message.type === 'error') {
        // Handle error messages
        process.stderr.write(message.data + '\n');
      } else {
        // Forward other messages back to parent
        parentPort.postMessage({
          type: 'response',
          data: `Worker processed: ${JSON.stringify(message)}`
        });
      }
    } catch (error) {
      parentPort.postMessage({
        type: 'error',
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Send ready message
  parentPort.postMessage({ type: 'ready' });
} else {
  // If not running as a worker, provide basic functionality
  module.exports = {
    postMessage: (message) => {
      console.log('Worker message:', message);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onMessage: () => {
      // No-op for non-worker context
    }
  };
}
