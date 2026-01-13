import type { Redis as UpstashRedis } from "@upstash/redis";
import logger from "@/lib/logger";

let upstashRedisInstance: UpstashRedis | null = null;

async function getUpstashRedis() {
  if (upstashRedisInstance) return upstashRedisInstance;
  
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    const { Redis } = await import("@upstash/redis");
    upstashRedisInstance = new Redis({
      url,
      token,
    });
  }
  
  return upstashRedisInstance;
}

const QUEUE_NAME = "smartmeet_ai_queue";

export interface Task {
  id: string;
  type: "PROCESS_MEETING";
  data: {
    meetingId: string;
  };
  createdAt: number;
}

/**
 * Push a task to the queue
 */
export async function enqueueTask(task: Omit<Task, "createdAt">): Promise<boolean> {
  const upstashRedis = await getUpstashRedis();
  if (!upstashRedis) {
    logger.warn("Upstash Redis not configured. Task not enqueued.");
    return false;
  }

  const fullTask: Task = {
    ...task,
    createdAt: Date.now(),
  };

  try {
    await upstashRedis.rpush(QUEUE_NAME, JSON.stringify(fullTask));
    return true;
  } catch (error) {
    logger.error({ error, taskId: task.id }, "Failed to enqueue task");
    return false;
  }
}

export async function dequeueTask(): Promise<Task | null> {
  const upstashRedis = await getUpstashRedis();
  if (!upstashRedis) return null;

  try {
    const taskData = await upstashRedis.lpop<string>(QUEUE_NAME);
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
  const upstashRedis = await getUpstashRedis();
  if (!upstashRedis) return 0;

  try {
    return await upstashRedis.llen(QUEUE_NAME);
  } catch (error) {
    logger.error({ error }, "Failed to get queue length");
    return 0;
  }
}
