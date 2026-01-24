import { NextRequest, NextResponse } from "next/server";
import { dequeueTask, enqueueTask, enqueueDLQ } from "@/lib/queue";
import logger from "@/lib/logger";
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  return await handleWorker(request);
}

export async function GET(request: NextRequest) {
  return await handleWorker(request);
}

async function handleWorker(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const workerSecret = process.env.WORKER_SECRET;

  if (workerSecret && authHeader !== `Bearer ${workerSecret}`) {
    return NextResponse.json(
      createErrorResponse(ApiErrorCode.UNAUTHORIZED, "Invalid worker secret"),
      { status: 401 }
    );
  }

  const results = [];
  let tasksProcessed = 0;
  const MAX_TASKS = 5; 
  const START_TIME = Date.now();
  const MAX_DURATION = 50000; // 50 seconds (standard Vercel timeout is 60s)
  const MAX_RETRIES = 3;

  while (tasksProcessed < MAX_TASKS) {
    // Check if we're approaching the timeout
    if (Date.now() - START_TIME > MAX_DURATION) {
      logger.info("Worker approaching timeout, stopping task processing");
      break;
    }

    const task = await dequeueTask();
    if (!task) break;

    try {
      logger.info({ taskId: task.id, type: task.type, retries: task.retries }, "Worker processing task");
      
      if (task.type === "PROCESS_MEETING" || task.type === "PROCESS_MEETING_AI") {
        const { meetingId } = task.data;
        
        // We need to dynamically import to avoid circular dependencies
        const { internalProcessMeetingAI } = await import("@/actions/meeting/ai");
        
        const result = await internalProcessMeetingAI(meetingId);
        results.push({ taskId: task.id, success: true, result });
      } else {
        results.push({ taskId: task.id, success: false, error: "Unknown task type" });
      }
    } catch (error: unknown) {
      logger.error({ error, taskId: task.id, retries: task.retries }, "Worker error processing task");
      
      const currentRetries = task.retries || 0;
      if (currentRetries < MAX_RETRIES) {
        // Re-enqueue with incremented retry count
        await enqueueTask({
          ...task,
          retries: currentRetries + 1
        });
        logger.info({ taskId: task.id, nextRetry: currentRetries + 1 }, "Task re-enqueued for retry");
      } else {
        // Move to DLQ
        await enqueueDLQ(task, error instanceof Error ? error.message : "Processing failed after max retries");
      }

      results.push({ 
        taskId: task.id, 
        success: false, 
        error: error instanceof Error ? error.message : "Processing failed" 
      });
    }
    tasksProcessed++;
  }

  return NextResponse.json(
    createSuccessResponse({ 
      processedCount: tasksProcessed,
      results 
    })
  );
}
