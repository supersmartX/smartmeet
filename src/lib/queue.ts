import { getRedisClient } from "@/lib/redis";
import logger from "@/lib/logger";

const QUEUE_NAME = "smartmeet_ai_queue";

export interface Task {
  id: string;
  type: "PROCESS_MEETING" | "PROCESS_MEETING_AI";
  data: {
    meetingId: string;
  };
  createdAt: number;
}

/**
 * Push a task to the queue
 */
export async function enqueueTask(task: Omit<Task, "createdAt">): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) {
    logger.warn("Redis not configured. Task not enqueued.");
    return false;
  }

  const fullTask: Task = {
    ...task,
    createdAt: Date.now(),
  };

  try {
    await redis.rpush(QUEUE_NAME, JSON.stringify(fullTask));
    return true;
  } catch (error) {
    logger.error({ error, taskId: task.id }, "Failed to enqueue task");
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
