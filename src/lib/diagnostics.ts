import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

export class Diagnostics {
  static async checkDatabase() {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - start;
      return { status: "HEALTHY", durationMs: duration };
    } catch (error) {
      logger.error({ error }, "Database diagnostic check failed");
      return { status: "UNHEALTHY", error: (error as Error).message };
    }
  }

  static async checkRedis() {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!url || !token) {
        return { status: "NOT_CONFIGURED" };
      }

      const start = Date.now();
      const response = await fetch(`${url}/ping`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Redis ping failed: ${response.statusText}`);
      
      const duration = Date.now() - start;
      return { status: "HEALTHY", durationMs: duration };
    } catch (error) {
      logger.error({ error }, "Redis diagnostic check failed");
      return { status: "UNHEALTHY", error: (error as Error).message };
    }
  }

  static async checkAIProvider() {
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
      if (!apiKey) return { status: "NOT_CONFIGURED" };

      // We don't want to make a real API call here to save costs/quota,
      // but we could check the circuit breaker state for the AI service.
      const { aiCircuitBreaker } = await import("@/lib/circuit-breaker");
      const state = await aiCircuitBreaker.getState();
      
      return { 
        status: state === "OPEN" ? "DEGRADED" : "HEALTHY",
        circuitBreakerState: state 
      };
    } catch (error) {
      logger.error({ error }, "AI Provider diagnostic check failed");
      return { status: "UNKNOWN", error: (error as Error).message };
    }
  }

  static async checkStorage() {
    try {
      const { supabaseAdmin } = await import("@/lib/supabase");
      if (!supabaseAdmin) return { status: "NOT_CONFIGURED" };

      const start = Date.now();
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      const duration = Date.now() - start;

      if (error) throw error;

      const hasRecordingsBucket = data.some(b => b.name === 'recordings');

      return { 
        status: hasRecordingsBucket ? "HEALTHY" : "DEGRADED", 
        durationMs: duration,
        bucketsFound: data.length,
        hasRecordingsBucket
      };
    } catch (error) {
      logger.error({ error }, "Storage diagnostic check failed");
      return { status: "UNHEALTHY", error: (error as Error).message };
    }
  }

  static async getFullReport() {
    const [db, redis, ai, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAIProvider(),
      this.checkStorage()
    ]);

    const report = {
      timestamp: new Date().toISOString(),
      systems: {
        database: db,
        redis,
        ai,
        storage
      },
      overall: (db.status === "HEALTHY" && redis.status !== "UNHEALTHY" && storage.status === "HEALTHY") ? "HEALTHY" : "DEGRADED"
    };

    logger.info(report, "System Diagnostic Report Generated");
    return report;
  }
}
