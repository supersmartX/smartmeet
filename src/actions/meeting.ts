"use server";

import { prisma } from "@/lib/prisma";
import { MeetingStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notification";
import { encrypt, decrypt } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { headers } from "next/headers";
import { cache } from "@/lib/cache";
import { checkApiRateLimit, checkGeneralRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { 
  generateCode, 
  summarizeText, 
  buildPrompt, 
  generatePlan,
  testCode,
  transcribeAudio
} from "@/services/api";
import { 
  meetingSchema, 
  meetingIdSchema, 
  updateMeetingTitleSchema,
  updateMeetingCodeSchema,
  apiKeyUpdateSchema,
  MeetingInput,
  ApiKeyUpdateInput
} from "@/lib/validations/meeting";
import {
  ActionResult,
  Meeting,
  MeetingWithRelations,
  Summary,
  UserWithMeetings,
  DashboardStat,
  MeetingUpdateData,
  AuditLog,
  Session,
  UserSettings,
  ActionItem
} from "@/types/meeting";

/**
 * Helper to get decrypted API key and mapped provider for a user
 */
async function getAIConfiguration(user: { apiKey: string | null; preferredProvider: string | null; preferredModel?: string | null }) {
  if (!user.apiKey) return { apiKey: null, provider: "openai", rawProvider: "openai", model: "gpt-4o" };

  const rawProvider = user.preferredProvider?.toLowerCase() || "openai";
  const model = user.preferredModel || (rawProvider === "openai" ? "gpt-4o" : undefined);
  const decrypted = decrypt(user.apiKey);
  let apiKey = decrypted;

  try {
    const keys = JSON.parse(decrypted);
    apiKey = keys[rawProvider] || keys["openai"] || Object.values(keys)[0] as string;
  } catch {
    // Legacy single key format
  }

  const providerMap: Record<string, string> = {
    "anthropic": "claude",
    "google": "gemini",
    "openai": "openai",
    "groq": "groq",
    "openrouter": "openrouter",
    "custom": "custom"
  };

  const provider = providerMap[rawProvider] || rawProvider;

  return { apiKey, provider, rawProvider, model };
}

/**
 * Helper to check rate limit for the current user/IP
 */
async function enforceRateLimit(type: "api" | "general" = "general") {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(',')[0] || 
             headerList.get("x-real-ip") || 
             "unknown";
  
  const session = await getServerSession(enhancedAuthOptions);
  const userId = session?.user?.id || "anonymous";
  const key = `${userId}:${ip}`;
  
  const result = type === "api" ? await checkApiRateLimit(key) : await checkGeneralRateLimit(key);
  
  if (!result.allowed) {
    throw new Error(`Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`);
  }
  
  return result;
}

export async function getDashboardStats(): Promise<ActionResult<DashboardStat[]>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const cacheKey = `user:${session.user.id}:stats`;
    const cachedStats = await cache.get<DashboardStat[]>(cacheKey);
    if (cachedStats) {
      return { success: true, data: cachedStats };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        plan: true,
        meetingQuota: true,
        meetingsUsed: true,
        meetings: {
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

    if (!user) return { success: false, error: "User not found" };

    const totalMeetings = user._count.meetings;
    const aiInsightsCount = user.meetings.reduce((acc: number, meeting) => {
      return acc + (meeting._count?.actionItems ?? 0) + (meeting.summary ? 1 : 0);
    }, 0);

    // Heuristic: Each meeting saves ~30 mins of manual note taking/reviewing
    const timeSavedHours = (totalMeetings * 0.5).toFixed(1);

    const complianceScore = totalMeetings > 0
      ? Math.round((user.meetings.filter((m) => m.summary || m._count.actionItems > 0).length / totalMeetings) * 100)
      : 0;

    const stats: DashboardStat[] = [
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

    await cache.set(cacheKey, stats, 300); // Cache for 5 minutes

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
    const cachedMeetings = await cache.get<Meeting[]>(cacheKey);
    if (cachedMeetings) {
      return { success: true, data: cachedMeetings };
    }

    const meetings = await prisma.meeting.findMany({
      where: {
        user: { email: session.user.email },
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

    await cache.set(cacheKey, meetings, 60); // Cache for 1 minute (meetings change more frequently than stats)
    return { success: true, data: meetings as unknown as Meeting[] };
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

export async function updateActionItemStatus(id: string, status: "PENDING" | "COMPLETED" | "IN_PROGRESS" | "CANCELLED"): Promise<ActionResult> {
  let session;
  try {
    await enforceRateLimit("general");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const actionItem = await prisma.actionItem.update({
      where: { id },
      data: { status },
      include: { meeting: { select: { userId: true } } }
    });

    await cache.delete(`user:${actionItem.meeting.userId}:stats`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, actionItemId: id }, "Update action item status error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update action item status" 
    };
  }
}

export async function getMeetingById(id: string): Promise<ActionResult<MeetingWithRelations>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

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

export async function togglePinned(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id, user: { email: session.user.email } },
      select: { isPinned: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };

    await prisma.meeting.update({
      where: { id },
      data: { isPinned: !meeting.isPinned }
    });

    const cacheKey = `user:${session.user.id}:meetings`;
    await cache.delete(cacheKey);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/recordings");

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, meetingId: id }, "Toggle pinned error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to toggle pinned status" 
    };
  }
}

export async function toggleFavorite(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id, user: { email: session.user.email } },
      select: { isFavorite: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };

    await prisma.meeting.update({
      where: { id },
      data: { isFavorite: !meeting.isFavorite }
    });

    const cacheKey = `user:${session.user.id}:meetings`;
    await cache.delete(cacheKey);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/recordings");

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, meetingId: id }, "Toggle favorite error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to toggle favorite status" 
    };
  }
}

/**
 * Update user API key and AI preferences
 */
export async function updateUserApiKey(data: ApiKeyUpdateInput): Promise<ActionResult> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const validatedData = apiKeyUpdateSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return { success: false, error: "User not found" };

    const updatePayload: {
      apiKey?: string | null;
      preferredProvider?: string;
      preferredModel?: string;
      allowedIps?: string;
      defaultLanguage?: string;
      summaryLength?: string;
      summaryPersona?: string;
      autoProcess?: boolean;
      lastUsedAt: Date;
    } = {
      lastUsedAt: new Date()
    };

    if (validatedData.apiKeys) {
      // Encrypt the entire object as a JSON string
      updatePayload.apiKey = encrypt(JSON.stringify(validatedData.apiKeys));
    } else if (validatedData.apiKey) {
      // Legacy support: if single apiKey is provided, wrap it in an object for the current provider
      const currentProvider = validatedData.preferredProvider || "openai";
      updatePayload.apiKey = encrypt(JSON.stringify({ [currentProvider]: validatedData.apiKey }));
    } else if (validatedData.apiKey === "" || validatedData.apiKeys === null) {
      updatePayload.apiKey = null;
    }

    if (validatedData.preferredProvider) updatePayload.preferredProvider = validatedData.preferredProvider;
    if (validatedData.preferredModel) updatePayload.preferredModel = validatedData.preferredModel;
    if (validatedData.allowedIps !== undefined) updatePayload.allowedIps = validatedData.allowedIps;
    if (validatedData.defaultLanguage !== undefined) updatePayload.defaultLanguage = validatedData.defaultLanguage;
    if (validatedData.summaryLength !== undefined) updatePayload.summaryLength = validatedData.summaryLength;
    if (validatedData.summaryPersona !== undefined) updatePayload.summaryPersona = validatedData.summaryPersona;
    if (validatedData.autoProcess !== undefined) updatePayload.autoProcess = validatedData.autoProcess;

    // Quota reset logic (optional but good for testing)
    // If the user is downgraded or upgraded, we might want to adjust meetingsUsed
    // For now, we keep it as is.

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updatePayload,
    });

    // Log the security event
    await logSecurityEvent(
      "API_KEY_UPDATED",
      user.id,
      `Provider: ${validatedData.preferredProvider || 'unchanged'}, Model: ${validatedData.preferredModel || 'unchanged'}, IP Restriction: ${validatedData.allowedIps ? 'enabled' : 'disabled'}`,
      "Settings"
    );

    await createNotification(user.id, {
      title: "Security Update",
      message: "Your API key and AI preferences have been updated successfully.",
      type: "SUCCESS",
      link: "/dashboard/settings"
    });

    return { success: true, data: updatedUser };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Update API key error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update API key" 
    };
  }
}

export async function getUserSettings(): Promise<ActionResult<UserSettings>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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
    const userApiKey = user.apiKey as string | null;
    
    if (userApiKey) {
      const decrypted = decrypt(userApiKey);
      try {
        apiKeys = JSON.parse(decrypted);
      } catch {
        // Fallback for legacy single-string API keys
        const provider = user.preferredProvider || "openai";
        apiKeys = { [provider]: decrypted };
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
      plan: user.plan as "FREE" | "PRO" | "ENTERPRISE",
      meetingQuota: user.meetingQuota,
      meetingsUsed: user.meetingsUsed,
      stripeSubscriptionId: user.stripeSubscriptionId
    };

    return { success: true, data: settings };
  } catch (error: unknown) {
    logger.error({ error }, "Get user settings error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch user settings" 
    };
  }
}

export async function createMeeting(data: MeetingInput): Promise<ActionResult<Meeting>> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        meetingsUsed: true, 
        meetingQuota: true, 
        plan: true,
        autoProcess: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true
      }
    });

    if (!user) return { success: false, error: "User not found" };

    // Strict Plan & Quota Check
    const isPlanActive = user.plan === "FREE" || 
                        (user.stripeSubscriptionId && user.stripeCurrentPeriodEnd && user.stripeCurrentPeriodEnd > new Date());

    if (!isPlanActive) {
      return { 
        success: false, 
        error: "Your subscription has expired. Please renew to continue creating meetings." 
      };
    }

    if (user.meetingsUsed >= user.meetingQuota) {
      return { 
        success: false, 
        error: `Meeting quota exceeded. You have used ${user.meetingsUsed}/${user.meetingQuota} meetings in your ${user.plan} plan. Please upgrade for more.` 
      };
    }

    const validatedData = meetingSchema.parse(data);

    const [meeting] = await prisma.$transaction([
      prisma.meeting.create({
        data: {
          title: validatedData.title,
          duration: validatedData.duration || "0:00",
          status: (user.autoProcess === false ? "PENDING" : "PROCESSING") as MeetingStatus,
          code: validatedData.code,
          audioUrl: validatedData.audioUrl,
          user: { connect: { email: session.user.email } },
        },
      }),
      prisma.user.update({
        where: { email: session.user.email },
        data: { meetingsUsed: { increment: 1 } }
      })
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/recordings");
    await Promise.all([
      cache.delete(`user:${user.id}:stats`),
      cache.delete(`user:${user.id}:meetings`)
    ]);
    
    // Include autoProcess in the response data so the client knows whether to enqueue
    const meetingWithPrefs = {
      ...meeting,
      autoProcess: user.autoProcess
    };
    
    return { success: true, data: meetingWithPrefs as unknown as Meeting & { autoProcess: boolean } };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Create meeting error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create meeting" 
    };
  }
}

export async function deleteMeeting(id: string): Promise<ActionResult> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const { id: validatedId } = meetingIdSchema.parse({ id });

    // 1. Get meeting to find audioUrl
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: validatedId,
        user: { email: session.user.email },
      },
      select: { audioUrl: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };

    // 2. Delete from storage if audioUrl exists
    if (meeting.audioUrl && supabaseAdmin) {
      try {
        const { error: storageError } = await supabaseAdmin
          .storage
          .from("recordings")
          .remove([meeting.audioUrl]);
        
        if (storageError) {
          logger.error({ storageError, meetingId: id }, "Storage deletion error");
          // We continue anyway to delete the DB record, but log it
        }
      } catch (err) {
        logger.error({ err, meetingId: id }, "Storage service error");
      }
    }

    // 3. Delete from database
    const deletedMeeting = await prisma.meeting.delete({
      where: {
        id: validatedId,
        user: { email: session.user.email },
      },
      select: { userId: true }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/recordings");
    await Promise.all([
      cache.delete(`user:${deletedMeeting.userId}:stats`),
      cache.delete(`user:${deletedMeeting.userId}:meetings`)
    ]);
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, meetingId: id }, "Delete meeting error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete meeting" 
    };
  }
}

export async function updateMeetingTitle(id: string, title: string): Promise<ActionResult<Meeting>> {
  let session;
  try {
    await enforceRateLimit("general");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const validatedData = updateMeetingTitleSchema.parse({ id, title });

    const meeting = await prisma.meeting.update({
      where: {
        id: validatedData.id,
        user: { email: session.user.email },
      },
      data: { title: validatedData.title },
    });

    revalidatePath("/dashboard/recordings");
    await Promise.all([
      cache.delete(`user:${meeting.userId}:stats`),
      cache.delete(`user:${meeting.userId}:meetings`)
    ]);
    return { success: true, data: meeting as unknown as Meeting };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, meetingId: id }, "Update meeting title error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update meeting title" 
    };
  }
}

export async function updateMeetingCode(id: string, code: string): Promise<ActionResult<Meeting>> {
  let session;
  try {
    await enforceRateLimit("general");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const validatedData = updateMeetingCodeSchema.parse({ id, code });

    const meeting = await prisma.meeting.update({
      where: {
        id: validatedData.id,
        user: { email: session.user.email },
      },
      data: { code: validatedData.code },
    });

    revalidatePath(`/dashboard/recordings/${id}`);
    await cache.delete(`user:${meeting.userId}:meetings`);
    return { success: true, data: meeting as unknown as Meeting };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, meetingId: id }, "Update meeting code error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update meeting code" 
    };
  }
}

export async function createSignedUploadUrl(fileName: string): Promise<ActionResult<{ signedUrl: string; path: string; token: string }>> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return { success: false, error: "User not found" };
    if (!supabaseAdmin) return { success: false, error: "Supabase Admin not configured" };

    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExt}`;
    const filePath = `private/${user.id}/${uniqueFileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('recordings')
      .createSignedUploadUrl(filePath);

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        signedUrl: data.signedUrl,
        path: filePath,
        token: data.token
      }
    };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, fileName }, "Create signed upload URL error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create upload URL" 
    };
  }
}

/**
 * Internal AI processing logic that can be called by both Server Actions and Background Workers
 */
export async function internalProcessMeetingAI(meetingId: string, clientIp?: string): Promise<ActionResult> {
  try {
    // 1. Get meeting and user details
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const meeting = await (prisma.meeting.findUnique as any)({
      where: { id: meetingId },
      select: {
        id: true,
        audioUrl: true,
        user: {
          select: { 
            id: true, 
            apiKey: true, 
            allowedIps: true,
            preferredProvider: true,
            preferredModel: true,
            defaultLanguage: true,
            summaryLength: true,
            plan: true
          }
        }
      }
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (!meeting || !meeting.user) return { success: false, error: "Meeting or user not found" };
    const user = meeting.user;

    // 2. Check IP Restriction if enabled (only if clientIp is provided)
    if (user.allowedIps && clientIp) {
      const allowedIps = user.allowedIps.split(',').map((ip: string) => ip.trim());

      if (clientIp !== "unknown" && !allowedIps.includes(clientIp)) {
        await logSecurityEvent(
          "API_KEY_IP_BLOCKED",
          user.id,
          `Blocked request from unauthorized IP: ${clientIp}`,
          "Security"
        );

        await prisma.meeting.update({
          where: { id: meetingId },
          data: { status: "FAILED" }
        });

        await createNotification(user.id, {
          title: "Processing Failed",
          message: `Blocked request from unauthorized IP: ${clientIp}`,
          type: "ERROR",
          link: `/dashboard/recordings/${meetingId}`
        });

        return { success: false, error: `Unauthorized IP: ${clientIp}. Please update your settings if this is you.` };
      }
    }

    if (!user.apiKey) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: "FAILED" }
      });

      await createNotification(user.id, {
        title: "Processing Failed",
        message: "API Key missing. Please add it in Settings.",
        type: "ERROR",
        link: "/dashboard/settings"
      });

      return { success: false, error: "API Key missing. Please add it in Settings." };
    }

    // Update lastUsedAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastUsedAt: new Date() }
    });

    if (!meeting.audioUrl) {
      return { success: false, error: "Audio URL missing for this meeting" };
    }

    // 2. Get a signed URL for downloading the file from Supabase
    if (!supabaseAdmin) return { success: false, error: "Supabase Admin not configured" };
    
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('recordings')
      .createSignedUrl(meeting.audioUrl, 3600); // 1 hour

    if (signedError || !signedData) {
      return { success: false, error: `Failed to generate download URL: ${signedError?.message}` };
    }

    // 3. Download the file using the signed URL
    const audioResponse = await fetch(signedData.signedUrl);
    if (!audioResponse.ok) {
      return { success: false, error: `Failed to download audio from storage: ${audioResponse.statusText}` };
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: audioResponse.headers.get("content-type") || "audio/mpeg" });

    // 4. Call the AI pipeline with user preferences
    const { apiKey: effectiveApiKey, provider, rawProvider } = await getAIConfiguration(user);

    // Feature gating based on plan
    const isPro = user.plan === "PRO" || user.plan === "ENTERPRISE";
    
    // If not pro, restrict expensive models even if they set them in settings
    const finalProvider = provider;
    let finalModel = user.preferredModel;

    if (!isPro && (provider === "openai" || provider === "claude")) {
      // Force cheaper models for free users to maintain capacity plan margins
      if (provider === "openai") finalModel = "gpt-4o-mini";
      // (Note: Add more restrictions as needed based on costs)
    }

    if (!effectiveApiKey) {
      return { success: false, error: "API Key missing for the selected provider." };
    }

    logger.info({ meetingId, provider }, "Starting AI pipeline");

    const { aiCircuitBreaker } = await import("@/lib/circuit-breaker");

    try {
      // Step 1: TRANSCRIPTION
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingStep: "TRANSCRIPTION" }
      });

      const transcriptionResult = await aiCircuitBreaker.execute(async () => {
        const res = await transcribeAudio(audioBlob, effectiveApiKey, user.defaultLanguage || undefined);
        if (!res.success) throw new Error(res.error || "Transcription failed");
        return res.data;
      });

      if (!transcriptionResult) throw new Error("Transcription failed");
      const transcription = transcriptionResult.transcription;

      // Step 2: SUMMARIZATION
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingStep: "SUMMARIZATION" }
      });

      const summaryResult = await aiCircuitBreaker.execute(async () => {
        const res = await summarizeText(transcription, { 
          api_key: effectiveApiKey, 
          provider: rawProvider.toUpperCase() as "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "OPENROUTER" | "CUSTOM",
          summary_length: user.summaryLength || undefined,
          summary_persona: user.summaryPersona || undefined,
          language: user.defaultLanguage || undefined
        });
        if (!res.success) throw new Error(res.error || "Summarization failed");
        return res.data;
      });

      if (!summaryResult) throw new Error("Summarization failed");
      const { summary, project_doc } = summaryResult;

      // Step 3: CODE_GENERATION
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingStep: "CODE_GENERATION" }
      });

      const codeResult = await aiCircuitBreaker.execute(async () => {
        const res = await generateCode(transcription, { 
          api_key: effectiveApiKey, 
          provider: finalProvider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom",
          model: finalModel || undefined
        });
        if (!res.success) throw new Error(res.error || "Code generation failed");
        return res.data;
      });

      if (!codeResult) throw new Error("Code generation failed");
      const { code } = codeResult;

      // Step 4: TESTING
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { processingStep: "TESTING" }
      });

      const testResult = await aiCircuitBreaker.execute(async () => {
        const res = await testCode(code, { 
          api_key: effectiveApiKey, 
          provider: (finalProvider === "openai" || finalProvider === "openrouter") ? "local" : finalProvider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom" | "local"
        });
        // We don't throw error if test fails, just record it
        return res.data;
      });

      // Final Save
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: "COMPLETED",
          processingStep: "COMPLETED",
          transcripts: {
            create: [{
              speaker: "AI Assistant",
              time: "0:00",
              text: transcription
            }]
          },
          summary: {
            create: { content: summary }
          },
          code: code,
          projectDoc: project_doc,
          testResults: testResult?.output || testResult?.error || "No test results"
        }
      });

      // Send success notification
      await createNotification(user.id, {
        title: "Processing Complete",
        message: `Your meeting "${meeting.title}" has been successfully processed.`,
        type: "SUCCESS",
        link: `/dashboard/recordings/${meetingId}`
      });

      // Increment meetings used count
      await prisma.user.update({
        where: { id: user.id },
        data: { meetingsUsed: { increment: 1 } }
      });

      return { success: true };

    } catch (error: unknown) {
      const errorDetail = error instanceof Error ? error.message : "AI Pipeline failed";
      
      logger.error({ error, meetingId, userId: user.id }, "Pipeline failure details");
      
      const breakerState = await aiCircuitBreaker.getState();
      const isBreakerOpen = breakerState === "OPEN";

      await prisma.meeting.update({
        where: { id: meetingId },
        data: { 
          status: "FAILED",
          processingStep: "FAILED",
          testResults: isBreakerOpen 
            ? "Service temporarily unavailable due to multiple previous failures. Please try again in a minute."
            : `System Error: ${errorDetail}`
        }
      });
      
      // Send failure notification
      await createNotification(user.id, {
        title: "Processing Failed",
        message: `Failed to process meeting "${meeting.title}": ${errorDetail}`,
        type: "ERROR",
        link: `/dashboard/recordings/${meetingId}`
      });
      
      return { 
        success: false, 
        error: errorDetail,
        message: isBreakerOpen 
          ? "AI service is temporarily unavailable. Please try again shortly."
          : "AI processing failed. Please check your settings."
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process meeting with AI";
    logger.error({ error, meetingId }, "Internal process meeting AI outer error");
    return { success: false, error: errorMessage };
  }
}

export async function processMeetingAI(meetingId: string): Promise<ActionResult> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    // Get client IP for restrictions
    const headerList = await headers();
    const clientIp = headerList.get("x-forwarded-for")?.split(',')[0] || 
                    headerList.get("x-real-ip") || 
                    "unknown";

    // Start background processing without blocking the request
    (async () => {
      try {
        logger.info({ meetingId, userId: session?.user?.id }, "Starting background AI processing");
        await internalProcessMeetingAI(meetingId, clientIp);
      } catch (err) {
        logger.error({ err, meetingId, userId: session?.user?.id }, "Background AI processing failed");
      }
    })();

    return { success: true, message: "AI processing started in the background" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Process meeting AI error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to process meeting" 
    };
  }
}

/**
 * Enqueue AI processing to be handled by a background worker
 */
export async function enqueueMeetingAI(meetingId: string): Promise<ActionResult> {
  // Simply delegate to processMeetingAI which now uses background processing
  return processMeetingAI(meetingId);
}


export async function updateMeetingStatus(id: string, status: MeetingStatus, data?: MeetingUpdateData): Promise<ActionResult<Meeting>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const updateData: {
      status: MeetingStatus;
      transcripts?: {
        create: {
          speaker: string;
          time: string;
          text: string;
        }[];
      };
      summary?: {
        create: {
          content: string;
        };
      };
      code?: string;
      projectDoc?: string;
      testResults?: string;
    } = { status };

    if (data) {
      if (data.transcription) {
        updateData.transcripts = {
          create: [{
            speaker: "AI Assistant",
            time: "0:00",
            text: data.transcription
          }]
        };
      }
      if (data.summary) {
        updateData.summary = {
          create: { content: data.summary }
        };
      }
      if (data.code) {
        updateData.code = data.code;
      }
      if (data.projectDoc) {
        updateData.projectDoc = data.projectDoc;
      }
      if (data.testResults) {
        updateData.testResults = data.testResults;
      }
    }

    const meeting = await prisma.meeting.update({
      where: { id, user: { email: session.user.email } },
      data: updateData
    });

    revalidatePath("/dashboard/recordings");
    revalidatePath(`/dashboard/recordings/${id}`);

    return { success: true, data: meeting as unknown as Meeting };
  } catch (error: unknown) {
    logger.error({ error, meetingId: id, userId: session?.user?.id }, "Update meeting status error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update meeting status" 
    };
  }
}

export async function getAuditLogs(): Promise<ActionResult<AuditLog[]>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return { success: false, error: "User not found" };

    const logs = await prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return { success: true, data: logs };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Get audit logs error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch audit logs"
    };
  }
}

export async function getActiveSessions(): Promise<ActionResult<Session[]>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return { success: false, error: "User not found" };

    const sessions = await prisma.session.findMany({
      where: { userId: user.id, expires: { gt: new Date() } },
      orderBy: { expires: "desc" },
      select: {
        id: true,
        expires: true,
        userAgent: true,
        ipAddress: true,
        sessionToken: true,
        userId: true
      }
    });

    return { success: true, data: sessions };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Get active sessions error");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch active sessions"
    };
  }
}

export async function generateMeetingLogic(meetingId: string): Promise<ActionResult<string>> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId, user: { email: session.user.email } },
      include: { transcripts: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { apiKey: true, preferredProvider: true }
    });

    if (!user?.apiKey) return { success: false, error: "API Key missing" };
    
    const { apiKey, provider, model } = await getAIConfiguration(user);
    if (!apiKey) return { success: false, error: "API Key missing for the selected provider." };

    const transcriptText = meeting.transcripts.map(t => `${t.speaker}: ${t.text}`).join("\n");

    const result = await generateCode(
      `Based on this meeting transcript, generate a structured business logic or implementation plan in TypeScript:\n\n${transcriptText}`,
      {
        api_key: apiKey,
        provider: provider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom",
        model: model
      }
    );

    if (result.success && result.data) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { code: result.data.code }
      });
      revalidatePath(`/dashboard/recordings/${meetingId}`);
      return { success: true, data: result.data.code };
    }

    return { success: false, error: result.error || "Failed to generate logic" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Generate meeting logic error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate logic" };
  }
}

export async function askAIAboutMeeting(meetingId: string, question: string): Promise<ActionResult<string>> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId, user: { email: session.user.email } },
      include: { transcripts: true, summary: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { apiKey: true, preferredProvider: true }
    });

    if (!user?.apiKey) return { success: false, error: "API Key missing" };
    
    const { apiKey, provider, model } = await getAIConfiguration(user);
    if (!apiKey) return { success: false, error: "API Key missing for the selected provider." };

    const context = `
      Meeting Title: ${meeting.title}
      Summary: ${meeting.summary?.content || "No summary available"}
      Transcript: ${meeting.transcripts.slice(0, 50).map(t => `${t.speaker}: ${t.text}`).join("\n")}
    `;

    // Use buildPrompt or generatePlan based on the question type or just a general summary call
    const result = await buildPrompt(
      `Context: ${context}\n\nQuestion: ${question}\n\nProvide a concise and helpful answer based on the meeting context.`,
      {
        api_key: apiKey,
        provider: provider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom",
        model: model
      }
    );

    if (result.success && result.data) {
      return { success: true, data: result.data.prompt };
    }

    return { success: false, error: result.error || "AI failed to answer" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Ask AI error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to get AI answer" };
  }
}

export async function revokeSession(sessionId: string): Promise<ActionResult> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return { success: false, error: "User not found" };

    // Only allow revoking sessions that belong to the current user
    const targetSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true }
    });

    if (!targetSession || targetSession.userId !== user.id) {
      return { success: false, error: "Session not found or unauthorized" };
    }

    await prisma.session.delete({
      where: { id: sessionId }
    });

    await logSecurityEvent(
      "SESSION_REVOKED",
      user.id,
      `Revoked session: ${sessionId}`,
      "Security"
    );

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, sessionId, userId: session?.user?.id }, "Revoke session error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to revoke session" 
    };
  }
}

export async function generateMeetingSummary(meetingId: string): Promise<ActionResult<Summary>> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId, user: { email: session.user.email } },
      include: { transcripts: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        apiKey: true, 
        preferredProvider: true,
        summaryPersona: true,
        summaryLength: true,
        defaultLanguage: true
      }
    });

    if (!user?.apiKey) return { success: false, error: "API Key missing" };
    
    const { apiKey, rawProvider } = await getAIConfiguration(user);
    if (!apiKey) return { success: false, error: "API Key missing for the selected provider." };

    const transcriptText = meeting.transcripts.map(t => `${t.speaker}: ${t.text}`).join("\n");

    const result = await summarizeText(transcriptText, {
      api_key: apiKey,
      provider: (rawProvider.toUpperCase() === "ANTHROPIC" ? "CLAUDE" :
                 rawProvider.toUpperCase() === "GOOGLE" ? "GEMINI" :
                 rawProvider.toUpperCase()) as "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "OPENROUTER" | "CUSTOM",
      summary_length: user.summaryLength || undefined,
      summary_persona: user.summaryPersona || undefined,
      language: user.defaultLanguage || undefined
    });

    if (result.success && result.data) {
      const summary = await prisma.summary.upsert({
        where: { meetingId },
        update: { content: result.data.summary },
        create: { meetingId, content: result.data.summary }
      });
      revalidatePath(`/dashboard/recordings/${meetingId}`);
      return { success: true, data: summary as Summary };
    }

    return { success: false, error: result.error || "Failed to generate summary" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Generate meeting summary error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate summary" };
  }
}

export async function testMeetingCompliance(meetingId: string): Promise<ActionResult<string>> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId, user: { email: session.user.email } },
      select: { code: true }
    });

    if (!meeting || !meeting.code) return { success: false, error: "Meeting logic not found. Generate logic first." };
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { apiKey: true, preferredProvider: true }
    });

    if (!user?.apiKey) return { success: false, error: "API Key missing" };
    
    const { apiKey, provider } = await getAIConfiguration(user);
    if (!apiKey) return { success: false, error: "API Key missing for the selected provider." };

    const result = await testCode(meeting.code, {
      api_key: apiKey,
      provider: provider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom" | "local"
    });

    if (result.success && result.data) {
      const output = (result.data.output || result.data.error || "") as string;
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { testResults: output }
      });
      revalidatePath(`/dashboard/recordings/${meetingId}`);
      return { success: true, data: output };
    }

    return { success: false, error: result.error || "Failed to run compliance tests" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Test meeting compliance error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to run compliance tests" };
  }
}

export async function generateMeetingPlan(meetingId: string): Promise<ActionResult<string>> {
  let session;
  try {
    await enforceRateLimit("api");
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId, user: { email: session.user.email } },
      include: { transcripts: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { apiKey: true, preferredProvider: true }
    });

    if (!user?.apiKey) return { success: false, error: "API Key missing" };
    
    const { apiKey, provider } = await getAIConfiguration(user);
    if (!apiKey) return { success: false, error: "API Key missing for the selected provider." };

    const transcriptText = meeting.transcripts.map(t => `${t.speaker}: ${t.text}`).join("\n");

    const result = await generatePlan(
      `Generate a detailed implementation plan based on this meeting transcript:\n\n${transcriptText}`,
      {
        api_key: apiKey,
        provider: provider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom"
      }
    );

    if (result.success && result.data) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { projectDoc: result.data.plan }
      });
      revalidatePath(`/dashboard/recordings/${meetingId}`);
      return { success: true, data: result.data.plan };
    }

    return { success: false, error: result.error || "Failed to generate plan" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Generate meeting plan error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate plan" };
  }
}
