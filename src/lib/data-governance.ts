import logger from "./logger";
import { purgeOldAuditLogs } from "./audit";

/**
 * CORE: Data Governance Utility
 * Handles Ownership, Retention, and Masking rules
 */

export const DataGovernance = {
  /**
   * Retention: Cleanup policy for old data
   */
  async runRetentionPolicy() {
    logger.info("Running data retention policy...");
    
    // 1. Purge Audit Logs (90 days)
    const purgedLogs = await purgeOldAuditLogs(90);
    
    // 2. Add other cleanup tasks here (e.g., temporary upload records)
    
    return {
      purgedLogs,
    };
  },

  /**
   * Ownership: Standardized ownership verification
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  async verifyOwnership(userId: string, resourceId: string, model: any) {
    const resource = await model.findUnique({
      where: { id: resourceId },
      select: { userId: true },
    });

    if (!resource || resource.userId !== userId) {
      throw new Error("Unauthorized access: Resource ownership verification failed");
    }

    return true;
  },

  /**
   * Quota & Entitlements: Check if user has required plan/quota
   */
  async checkEntitlement(userId: string, feature?: string) {
    const { QuotaService } = await import("./quota");
    
    if (feature) {
      const hasFeature = await QuotaService.hasFeature(userId, feature);
      if (!hasFeature) {
        throw new Error(`Feature '${feature}' is not available on your current plan.`);
      }
    }

    const quota = await QuotaService.checkMeetingQuota(userId);
    if (!quota.allowed) {
      throw new Error("Meeting quota exceeded. Please upgrade your plan or wait until tomorrow.");
    }

    return quota;
  },

  /**
   * Masking: Utility for PII/Sensitive data masking in logs
   */
  maskLogData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    const sensitiveFields = ['password', 'apiKey', 'mfaSecret', 'token', 'secret'];
    
    const masked = Array.isArray(data) ? [...data] : { ...data };
    
    if (Array.isArray(masked)) {
      return masked.map(item => this.maskLogData(item));
    }

    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = '********';
      }
    }
    
    // Recursively mask nested objects
    for (const key in masked) {
      if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskLogData(masked[key]);
      }
    }

    return masked;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
};
