import { NextRequest, NextResponse } from "next/server";
import { dequeueTask } from "@/lib/queue";
import logger from "@/lib/logger";

// This would ideally be a dedicated worker, but for Next.js/Vercel, 
// we can use an API route triggered by a Cron job or a long-running process.

// Note: We'll need to manually import the internal function since we can't 
// easily import it from server actions file if it's not exported.
// I'll export it from meeting.ts first.

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const workerSecret = process.env.WORKER_SECRET;

  if (workerSecret && authHeader !== `Bearer ${workerSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];
  let tasksProcessed = 0;
  const MAX_TASKS = 5; 
  const START_TIME = Date.now();
  const MAX_DURATION = 50000; // 50 seconds (standard Vercel timeout is 60s)

  while (tasksProcessed < MAX_TASKS) {
    // Check if we're approaching the timeout
    if (Date.now() - START_TIME > MAX_DURATION) {
      logger.info("Worker approaching timeout, stopping task processing");
      break;
    }

    const task = await dequeueTask();
    if (!task) break;

    try {
      logger.info({ taskId: task.id, type: task.type }, "Worker processing task");
      
      if (task.type === "PROCESS_MEETING") {
        const { meetingId } = task.data;
        
        // We need to dynamically import to avoid circular dependencies
        const { internalProcessMeetingAI } = await import("@/actions/meeting");
        
        const result = await internalProcessMeetingAI(meetingId);
        results.push({ taskId: task.id, success: true, result });
      } else {
        results.push({ taskId: task.id, success: false, error: "Unknown task type" });
      }
    } catch (error) {
      logger.error({ error, taskId: task.id }, "Worker error processing task");
      results.push({ 
        taskId: task.id, 
        success: false, 
        error: error instanceof Error ? error.message : "Processing failed" 
      });
    }
    tasksProcessed++;
  }

  return NextResponse.json({ 
    processedCount: tasksProcessed,
    results 
  });
}
