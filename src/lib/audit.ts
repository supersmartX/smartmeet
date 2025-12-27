import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

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
    console.error("Failed to write audit log:", error);
    // Don't throw error to prevent blocking main flow
  }
}
