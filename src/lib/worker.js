import { parentPort } from 'worker_threads';

// Fallback functions for non-worker context
export const postMessage = (message) => {
  if (parentPort) {
    parentPort.postMessage(message);
  } else {
    console.log('Worker message:', message);
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const onMessage = (callback) => {
  if (parentPort) {
    parentPort.on('message', callback);
  }
};

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
}
