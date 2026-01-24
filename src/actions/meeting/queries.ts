"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { cache } from "@/lib/cache";
import logger from "@/lib/logger";
import {
  ActionResult,
  Meeting,
  MeetingWithRelations,
  UserWithMeetings,
  DashboardStat,
  AuditLog,
  UserSettings,
  ActionItem,
  Session
} from "@/types/meeting";
import { meetingIdSchema } from "@/lib/validations/meeting";
import { decrypt } from "@/lib/crypto";

export async function getDashboardStats(): Promise<ActionResult<DashboardStat[]>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const cacheKey = `user:${session.user.id}:stats`;
    
    const stats = await cache.swr<DashboardStat[]>(
      cacheKey,
      async () => {
        const user = await prisma.user.findUnique({
          where: { email: session!.user!.email! },
          select: {
            id: true,
            email: true,
            plan: true,
            meetingQuota: true,
            meetingsUsed: true,
            meetings: {
              take: 1000,
              orderBy: { date: 'desc' },
              include: {
                _count: {
                  select: { actionItems: true }
                },
                summary: true
              }
            },
            _count: {
              select: { meetings: true },
            },
          },
        }) as UserWithMeetings | null;

        if (!user) throw new Error("User not found");

        const totalMeetings = user._count.meetings;
        const aiInsightsCount = user.meetings.reduce((acc: number, meeting) => {
          return acc + (meeting._count?.actionItems ?? 0) + (meeting.summary ? 1 : 0);
        }, 0);

        const timeSavedHours = (totalMeetings * 0.5).toFixed(1);

        const complianceScore = totalMeetings > 0
          ? Math.round((user.meetings.filter((m) => m.summary || m._count.actionItems > 0).length / totalMeetings) * 100)
          : 0;

        return [
          {
            label: "Total Meetings",
            value: totalMeetings.toString(),
            icon: "Video",
            color: "text-brand-via",
            bg: "bg-brand-via/10",
            trend: `${user.meetingsUsed}/${user.meetingQuota} used`,
            href: "/dashboard/recordings"
          },
          {
            label: "AI Insights",
            value: aiInsightsCount.toString(),
            icon: "Sparkles",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            trend: aiInsightsCount > 0 ? "+5%" : "0%",
            href: "/dashboard/recordings?filter=action+items"
          },
          {
            label: "Time Saved",
            value: `${timeSavedHours}h`,
            icon: "Zap",
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            trend: "+18%",
            href: "/dashboard/recordings"
          },
          {
            label: "Compliance",
            value: `${complianceScore}%`,
            icon: "ShieldCheck",
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            trend: "+2%",
            href: "/dashboard/security"
          }
        ];
      },
      300, // 5 minutes TTL
      86400 // 24 hours stale
    );

    return { success: true, data: stats };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Get dashboard stats error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats" 
    };
  }
}

export async function getMeetings(): Promise<ActionResult<Meeting[]>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const cacheKey = `user:${session.user.id}:meetings`;
    
    const meetings = await cache.swr<Meeting[]>(
      cacheKey,
      async () => {
        const data = await prisma.meeting.findMany({
          where: {
            user: { email: session!.user!.email! },
          },
          orderBy: [
            { isPinned: "desc" },
            { date: "desc" },
          ],
          include: {
            summary: true,
            transcripts: {
              select: {
                text: true
              }
            },
            _count: {
              select: { actionItems: true }
            }
          }
        });
        return data as unknown as Meeting[];
      },
      60, // 1 minute TTL
      300 // 5 minutes stale
    );

    return { success: true, data: meetings };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Get meetings error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch meetings" 
    };
  }
}

export async function getActionItems(): Promise<ActionResult<(ActionItem & { meetingTitle: string; meetingDate: Date })[]>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const actionItems = await prisma.actionItem.findMany({
      where: {
        meeting: {
          user: { email: session.user.email }
        }
      },
      include: {
        meeting: {
          select: {
            title: true,
            date: true
          }
        }
      },
      orderBy: {
        meeting: {
          date: "desc"
        }
      }
    });

    const formattedActionItems = actionItems.map(item => ({
      ...item,
      meetingTitle: item.meeting.title,
      meetingDate: item.meeting.date
    }));

    return { success: true, data: formattedActionItems };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Get action items error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch action items" 
    };
  }
}

export async function getMeetingById(id: string): Promise<ActionResult<MeetingWithRelations>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    // Add input validation
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return { success: false, error: "Invalid meeting ID" };
    }

    const validatedId = meetingIdSchema.parse({ id });

    const meeting = await prisma.meeting.findUnique({
      where: {
        id: validatedId.id,
        user: { email: session.user.email },
      },
      include: {
        transcripts: true,
        summary: true,
        actionItems: true,
      },
    }) as MeetingWithRelations | null;

    if (!meeting) return { success: false, error: "Meeting not found" };

    return { success: true, data: meeting };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, meetingId: id }, "Get meeting by ID error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch meeting" 
    };
  }
}

export async function getUserSettings(): Promise<ActionResult<UserSettings>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        apiKey: true,
        preferredProvider: true,
        preferredModel: true,
        allowedIps: true,
        lastUsedAt: true,
        name: true,
        email: true,
        image: true,
        mfaEnabled: true,
        defaultLanguage: true,
        summaryLength: true,
        summaryPersona: true,
        autoProcess: true,
        plan: true,
        meetingQuota: true,
        meetingsUsed: true,
        stripeSubscriptionId: true,
      }
    });

    if (!user) return { success: false, error: "User not found" };

    let apiKeys: Record<string, string> = {};
    let decryptionError = false;
    const userApiKey = user.apiKey as string | null;
    
    if (userApiKey) {
      try {
        const decrypted = decrypt(userApiKey);
        try {
          apiKeys = JSON.parse(decrypted);
        } catch {
          // Fallback for legacy single-string API keys
          const provider = user.preferredProvider || "openai";
          apiKeys = { [provider]: decrypted };
        }
      } catch (decryptErr) {
        logger.error({ decryptError: decryptErr, userId: user.id }, "Failed to decrypt user API key in settings");
        // Don't crash the whole settings page if decryption fails
        // This allows the user to at least see their profile and re-enter their key
        apiKeys = {};
        decryptionError = true;
      }
    }

    const settings: UserSettings = {
      apiKey: userApiKey ? (apiKeys[user.preferredProvider || "openai"] || "") : null,
      apiKeys,
      preferredProvider: user.preferredProvider || "openai",
      preferredModel: user.preferredModel || "gpt-4o",
      allowedIps: user.allowedIps || "",
      lastUsedAt: user.lastUsedAt,
      name: user.name,
      email: user.email,
      image: user.image,
      mfaEnabled: user.mfaEnabled,
      defaultLanguage: user.defaultLanguage || "en",
      summaryLength: user.summaryLength || "medium",
      summaryPersona: user.summaryPersona || "balanced",
      autoProcess: user.autoProcess ?? true,
      plan: user.plan as "FREE" | "PRO" | "ENTERPRISE",
      meetingQuota: user.meetingQuota,
      meetingsUsed: user.meetingsUsed,
      stripeSubscriptionId: user.stripeSubscriptionId,
      decryptionError
    };

    return { success: true, data: settings };
  } catch (error: unknown) {
    logger.error({ 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userId: session?.user?.id 
    }, "Get user settings error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch user settings" 
    };
  }
}

export async function getAuditLogs(): Promise<ActionResult<AuditLog[]>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const logs = await prisma.auditLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return { success: true, data: logs as AuditLog[] };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Get audit logs error");
    return { success: false, error: "Failed to load audit logs" };
  }
}

export async function getActiveSessions(): Promise<ActionResult<Session[]>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const sessions = await prisma.session.findMany({
      where: { 
        userId: session.user.id,
        expires: { gt: new Date() }
      },
      orderBy: { expires: "desc" }
    });

    return { success: true, data: sessions as Session[] };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Get active sessions error");
    return { success: false, error: "Failed to load active sessions" };
  }
}
