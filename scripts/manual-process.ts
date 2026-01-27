
import { dequeueTask } from "../src/lib/queue";
import { internalProcessMeetingAI } from "../src/actions/meeting/ai";
import logger from "../src/lib/logger";

async function processQueue() {
  console.log("Starting manual queue processor...");
  
  let processedCount = 0;
  while (true) {
    const task = await dequeueTask();
    if (!task) {
      console.log("No more tasks in queue.");
      break;
    }

    console.log(`Processing task ${task.id} for meeting ${task.data.meetingId}...`);
    try {
      const result = await internalProcessMeetingAI(task.data.meetingId);
      if (result.success) {
        console.log(`Successfully processed meeting ${task.data.meetingId}`);
        processedCount++;
      } else {
        console.error(`Failed to process meeting ${task.data.meetingId}: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error);
    }
  }

  console.log(`Finished processing ${processedCount} tasks.`);
  process.exit(0);
}

processQueue().catch(err => {
  console.error("Queue processor failed:", err);
  process.exit(1);
});
