import { getRedisClient } from "@/lib/redis";
import logger from "@/lib/logger";
import { ServiceError } from "@/lib/errors";

const QUEUE_NAME = "smartmeet_ai_queue";
const DLQ_NAME = "smartmeet_ai_dlq";

export interface Task {
  id: string;
  type: "PROCESS_MEETING" | "PROCESS_MEETING_AI";
  data: {
    meetingId: string;
  };
  createdAt: number;
  retries?: number;
  error?: string;
}

/**
 * Push a task to the queue
 */
export async function enqueueTask(task: Omit<Task, "createdAt">): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) {
    throw new ServiceError("Redis not configured. AI processing queue is unavailable.", "ERR_REDIS_CONFIG");
  }

  const fullTask: Task = {
    ...task,
    createdAt: Date.now(),
    retries: task.retries || 0,
  };

  try {
    await redis.rpush(QUEUE_NAME, JSON.stringify(fullTask));
    return true;
  } catch (error) {
    logger.error({ error, taskId: task.id }, "Failed to enqueue task");
    return false;
  }
}

/**
 * Push a task to the Dead Letter Queue
 */
export async function enqueueDLQ(task: Task, error: string): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false;

  const failedTask: Task = {
    ...task,
    error,
    retries: (task.retries || 0) + 1,
  };

  try {
    await redis.rpush(DLQ_NAME, JSON.stringify(failedTask));
    logger.error({ taskId: task.id, error }, "Task moved to DLQ");
    return true;
  } catch (err) {
    logger.error({ err, taskId: task.id }, "Failed to enqueue to DLQ");
    return false;
  }
}

export async function dequeueTask(): Promise<Task | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const taskData = await redis.lpop<string>(QUEUE_NAME);
    if (!taskData) return null;

    return JSON.parse(taskData) as Task;
  } catch (error) {
    logger.error({ error }, "Failed to dequeue task");
    return null;
  }
}

/**
 * Get queue length
 */
export async function getQueueLength(): Promise<number> {
  const redis = await getRedisClient();
  if (!redis) return 0;

  try {
    return await redis.llen(QUEUE_NAME);
  } catch (error) {
    logger.error({ error }, "Failed to get queue length");
    return 0;
  }
}
