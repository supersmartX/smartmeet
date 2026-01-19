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
