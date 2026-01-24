"use server";

import { prisma } from "@/lib/prisma";
import { MeetingStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { revalidatePath } from "next/cache";
import { encrypt } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/audit";
import logger from "@/lib/logger";
import { 
  triggerWorker
} from "./utils";
import { 
  meetingSchema, 
  updateMeetingTitleSchema,
  updateMeetingCodeSchema,
  apiKeyUpdateSchema,
  MeetingInput,
  ApiKeyUpdateInput
} from "@/lib/validations/meeting";
import { enqueueTask } from "@/lib/queue";
import { v4 as uuidv4 } from "uuid";
import {
  ActionResult,
  Meeting,
  MeetingUpdateData
} from "@/types/meeting";

export async function updateActionItemStatus(id: string, status: "PENDING" | "COMPLETED" | "IN_PROGRESS" | "CANCELLED"): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const actionItem = await prisma.actionItem.findUnique({
      where: { id },
      include: { meeting: true }
    });

    if (!actionItem || actionItem.meeting.userId !== session.user.id) {
      return { success: false, error: "Action item not found or unauthorized" };
    }

    await prisma.actionItem.update({
      where: { id },
      data: { status }
    });

    revalidatePath(`/dashboard/recordings/${actionItem.meetingId}`);
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, actionItemId: id }, "Update action item status error");
    return { success: false, error: "Failed to update status" };
  }
}

export async function togglePinned(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { userId: true, isPinned: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    await prisma.meeting.update({
      where: { id },
      data: { isPinned: !meeting.isPinned }
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/recordings');
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, meetingId: id }, "Toggle pinned error");
    return { success: false, error: "Failed to update pinned status" };
  }
}

export async function toggleFavorite(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { userId: true, isFavorite: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    await prisma.meeting.update({
      where: { id },
      data: { isFavorite: !meeting.isFavorite }
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/recordings');
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, meetingId: id }, "Toggle favorite error");
    return { success: false, error: "Failed to update favorite status" };
  }
}

export async function updateUserApiKey(data: ApiKeyUpdateInput): Promise<ActionResult> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = apiKeyUpdateSchema.parse(data);
    
    let encryptedKey = undefined;
    if (validated.apiKeys) {
      encryptedKey = encrypt(JSON.stringify(validated.apiKeys));
    } else if (validated.apiKey) {
      encryptedKey = encrypt(validated.apiKey);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(encryptedKey && { apiKey: encryptedKey }),
        ...(validated.preferredProvider && { preferredProvider: validated.preferredProvider }),
        ...(validated.preferredModel && { preferredModel: validated.preferredModel }),
        ...(validated.allowedIps && { allowedIps: validated.allowedIps }),
        ...(validated.defaultLanguage && { defaultLanguage: validated.defaultLanguage }),
        ...(validated.summaryLength && { summaryLength: validated.summaryLength }),
        ...(validated.summaryPersona && { summaryPersona: validated.summaryPersona }),
        ...(typeof validated.autoProcess === 'boolean' && { autoProcess: validated.autoProcess }),
      }
    });

    await logSecurityEvent(
      "API_KEY_UPDATE",
      session.user.id,
      "User updated AI configuration",
      "User"
    );

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Update user API key error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to update settings" };
  }
}

export async function createMeeting(data: MeetingInput): Promise<ActionResult<Meeting>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = meetingSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { meetingsUsed: true, meetingQuota: true }
    });

    if (!user || user.meetingsUsed >= user.meetingQuota) {
      return { success: false, error: "Meeting quota exceeded. Please upgrade your plan." };
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: validated.title,
        duration: validated.duration,
        code: validated.code,
        audioUrl: validated.audioUrl,
        userId: session.user.id,
        status: "PENDING"
      }
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { meetingsUsed: { increment: 1 } }
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/recordings');
    
    // Enqueue background processing task
    try {
      await enqueueTask({
        id: uuidv4(),
        type: "PROCESS_MEETING_AI",
        data: { meetingId: meeting.id }
      });
      
      // Trigger worker to start processing immediately
      await triggerWorker();
    } catch (enqueueError) {
      logger.error({ enqueueError, meetingId: meeting.id }, "Failed to enqueue meeting processing");
      // We don't fail the meeting creation here, as the record is already saved
    }
    
    return { success: true, data: meeting as Meeting };
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id }, "Create meeting error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to create meeting" };
  }
}

export async function deleteMeeting(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    await prisma.meeting.delete({
      where: { id }
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/recordings');
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, meetingId: id }, "Delete meeting error");
    return { success: false, error: "Failed to delete meeting" };
  }
}

export async function updateMeetingTitle(id: string, title: string): Promise<ActionResult<Meeting>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = updateMeetingTitleSchema.parse({ id, title });

    const meeting = await prisma.meeting.findUnique({
      where: { id: validated.id },
      select: { userId: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    const updated = await prisma.meeting.update({
      where: { id: validated.id },
      data: { title: validated.title }
    });

    revalidatePath(`/dashboard/recordings/${id}`);
    return { success: true, data: updated as Meeting };
  } catch (error: unknown) {
    logger.error({ error, meetingId: id }, "Update meeting title error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to update title" };
  }
}

export async function updateMeetingCode(id: string, code: string): Promise<ActionResult<Meeting>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = updateMeetingCodeSchema.parse({ id, code });

    const meeting = await prisma.meeting.findUnique({
      where: { id: validated.id },
      select: { userId: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    const updated = await prisma.meeting.update({
      where: { id: validated.id },
      data: { code: validated.code }
    });

    revalidatePath(`/dashboard/recordings/${id}`);
    return { success: true, data: updated as Meeting };
  } catch (error: unknown) {
    logger.error({ error, meetingId: id }, "Update meeting code error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to update code" };
  }
}

export async function updateMeetingStatus(id: string, status: MeetingStatus, data?: MeetingUpdateData): Promise<ActionResult<Meeting>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        status,
        ...(data && {
          processingStep: data.processingStep,
          testResults: data.testResults,
        })
      }
    });

    revalidatePath(`/dashboard/recordings/${id}`);
    return { success: true, data: updated as Meeting };
  } catch (error: unknown) {
    logger.error({ error, meetingId: id }, "Update meeting status error");
    return { success: false, error: "Failed to update meeting status" };
  }
}

export async function revokeSession(sessionId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const targetSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true }
    });

    if (!targetSession || targetSession.userId !== session.user.id) {
      return { success: false, error: "Session not found" };
    }

    await prisma.session.delete({
      where: { id: sessionId }
    });

    await logSecurityEvent(
      "SESSION_REVOKE",
      session.user.id,
      `User revoked session ${sessionId}`,
      "Session"
    );

    revalidatePath('/dashboard/security');
    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, sessionId }, "Revoke session error");
    return { success: false, error: "Failed to revoke session" };
  }
}
