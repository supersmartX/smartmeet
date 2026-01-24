import { prisma } from "./prisma";
import logger from "./logger";
import { UserPlan } from "@prisma/client";
import { createNotification } from "@/actions/notification";

/**
 * CORE: Quota and Feature Management Service
 * Handles token limits, feature flags, and usage caps.
 */

export interface PlanLimits {
  monthlyTokenLimit: number;
  dailyMeetingLimit: number;
  maxFileSizeMb: number;
  features: string[];
}

export const PLAN_CONFIGS: Record<UserPlan, PlanLimits> = {
  FREE: {
    monthlyTokenLimit: 50000,
    dailyMeetingLimit: 2,
    maxFileSizeMb: 10,
    features: ["transcription", "basic_summary", "ai_processing"],
  },
  PRO: {
    monthlyTokenLimit: 500000,
    dailyMeetingLimit: 10,
    maxFileSizeMb: 50,
    features: ["transcription", "detailed_summary", "code_generation", "test_execution", "ai_processing"],
  },
  ENTERPRISE: {
    monthlyTokenLimit: 5000000,
    dailyMeetingLimit: 100,
    maxFileSizeMb: 200,
    features: ["transcription", "detailed_summary", "code_generation", "test_execution", "custom_prompts", "rbac", "ai_processing"],
  },
};

export const QuotaService = {
  /**
   * Check if a user has access to a specific feature
   */
  async hasFeature(userId: string, feature: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) return false;
    const limits = PLAN_CONFIGS[user.plan];
    return limits.features.includes(feature);
  },

  /**
   * Check and increment meeting usage
   */
  async checkMeetingQuota(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, meetingsUsed: true, meetingQuota: true },
    });

    if (!user) return { allowed: false, remaining: 0 };

    const planLimits = PLAN_CONFIGS[user.plan];
    const dailyLimit = planLimits.dailyMeetingLimit;
    
    // Check if user has reached their total or daily limit
    if (user.meetingsUsed >= user.meetingQuota) {
      await this.triggerAlert(userId, "TOTAL_QUOTA_REACHED");
      return { allowed: false, remaining: 0 };
    }

    // Check daily usage from meetings table
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const meetingsToday = await prisma.meeting.count({
      where: {
        userId,
        createdAt: { gte: today },
      },
    });

    if (meetingsToday >= dailyLimit) {
      return { allowed: false, remaining: 0 };
    }

    // Alert at 80% usage
    if (user.meetingsUsed >= user.meetingQuota * 0.8) {
      await this.triggerAlert(userId, "QUOTA_THRESHOLD_80");
    }

    return { 
      allowed: true, 
      remaining: user.meetingQuota - user.meetingsUsed 
    };
  },

  /**
   * Record token usage for AI operations
   */
  async recordTokenUsage(userId: string, tokens: number): Promise<void> {
    // This would typically involve a separate Usage table for monthly tracking
    // For now, we log it and could update a field in User or a new Usage model
    logger.info({ userId, tokens }, "Token usage recorded");
    
    // Logic for monthly cap checks would go here
  },

  /**
   * Trigger notifications/alerts for quota thresholds
   */
  async triggerAlert(userId: string, type: string) {
    const messages: Record<string, string> = {
      "QUOTA_THRESHOLD_80": "You have used 80% of your meeting quota.",
      "TOTAL_QUOTA_REACHED": "You have reached your total meeting quota. Please upgrade your plan.",
    };

    if (messages[type]) {
      try {
        await createNotification(userId, {
          title: "Quota Alert",
          message: messages[type],
          type: type === "TOTAL_QUOTA_REACHED" ? "ERROR" : "WARNING",
        });
      } catch (error) {
        logger.error({ error, userId, type }, "Failed to trigger quota alert notification");
      }
    }
  }
};
