import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import logger from "./logger";

export async function logSecurityEvent(
  action: string,
  userId?: string,
  details?: string,
  resource?: string
) {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await prisma.auditLog.create({
      data: {
        action,
        userId,
        details,
        resource,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    logger.error({ error, action, userId }, "Failed to log security event");
  }
}

/**
 * Retention Policy: Purge audit logs older than a certain period
 * Default: 90 days
 */
export async function purgeOldAuditLogs(daysRetained: number = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysRetained);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info({ count: result.count, cutoffDate }, "Purged old audit logs");
    return result.count;
  } catch (error) {
    logger.error({ error }, "Failed to purge old audit logs");
    return 0;
  }
}
