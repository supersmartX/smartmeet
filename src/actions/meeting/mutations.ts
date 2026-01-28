"use server";

import { prisma } from "@/lib/prisma";
import { MeetingStatus, ProcessingStep } from "@prisma/client";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { revalidatePath } from "next/cache";
import { encrypt } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/audit";
import { cache } from "@/lib/cache";
import logger from "@/lib/logger";
import { QuotaService } from "@/lib/quota";
import { supabaseAdmin } from "@/lib/supabase";
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

    await cache.invalidateUserCache(session.user.id);
    revalidatePath(`/dashboard/recordings/${actionItem.meetingId}`);
    revalidatePath('/dashboard');
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

    await cache.invalidateUserCache(session.user.id);
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

    await cache.invalidateUserCache(session.user.id);
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

export async function validateApiKey(provider: string, key: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    if (!key) return { success: false, error: "API key is required" };

    let isValid = false;
    let errorMessage = "";

    // Validation logic per provider
    switch (provider) {
      case 'openai':
        try {
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: { "Authorization": `Bearer ${key}` }
          });
          isValid = response.status === 200;
          if (!isValid) errorMessage = "Invalid OpenAI API key or insufficient permissions.";
        } catch {
          errorMessage = "Failed to reach OpenAI API.";
        }
        break;
      case 'anthropic':
        try {
          // Anthropic doesn't have a simple GET /models, so we check a small request
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": key,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json"
            },
            body: JSON.stringify({
              model: "claude-3-haiku-20240307",
              max_tokens: 1,
              messages: [{ role: "user", content: "Hi" }]
            })
          });
          isValid = response.status === 200 || response.status === 400; // 400 might mean bad request but key is valid
          if (response.status === 401) {
            isValid = false;
            errorMessage = "Invalid Anthropic API key.";
          } else {
            isValid = true;
          }
        } catch {
          errorMessage = "Failed to reach Anthropic API.";
        }
        break;
      case 'google':
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
          isValid = response.status === 200;
          if (!isValid) errorMessage = "Invalid Google API key.";
        } catch {
          errorMessage = "Failed to reach Google API.";
        }
        break;
      case 'groq':
        try {
          const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { "Authorization": `Bearer ${key}` }
          });
          isValid = response.status === 200;
          if (!isValid) errorMessage = "Invalid Groq API key.";
        } catch {
          errorMessage = "Failed to reach Groq API.";
        }
        break;
      default:
        // For custom or unknown, we just check if it's not empty
        isValid = key.length > 5;
        if (!isValid) errorMessage = "Invalid API key format.";
    }

    if (isValid) {
      return { success: true };
    } else {
      return { success: false, error: errorMessage || "Validation failed." };
    }
  } catch (error: unknown) {
    logger.error({ error, provider }, "Validate API key error");
    return { success: false, error: "An error occurred during validation." };
  }
}

export async function createMeeting(data: MeetingInput): Promise<ActionResult<Meeting>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const validated = meetingSchema.parse(data);
    
    // Check comprehensive meeting quota (total + daily)
    const quotaCheck = await QuotaService.checkMeetingQuota(session.user.id);
    if (!quotaCheck.allowed) {
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

    await cache.invalidateUserCache(session.user.id);
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
      await triggerWorker(meeting.id);
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
      select: { userId: true, audioUrl: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    // Delete from Supabase Storage if file exists
    if (meeting.audioUrl && supabaseAdmin) {
      try {
        const { error: storageError } = await supabaseAdmin
          .storage
          .from('recordings')
          .remove([meeting.audioUrl]);
        
        if (storageError) {
          logger.error({ storageError, path: meeting.audioUrl }, "Failed to delete file from storage");
        }
      } catch (err) {
        logger.error({ err, path: meeting.audioUrl }, "Error deleting file from storage");
      }
    }

    await prisma.meeting.delete({
      where: { id }
    });

    await cache.invalidateUserCache(session.user.id);
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

    await cache.invalidateUserCache(session.user.id);
    revalidatePath(`/dashboard/recordings/${id}`);
    revalidatePath('/dashboard/recordings');
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

    await cache.invalidateUserCache(session.user.id);
    revalidatePath(`/dashboard/recordings/${id}`);
    revalidatePath('/dashboard/recordings');
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
          processingStep: data.processingStep as ProcessingStep,
          testResults: data.testResults,
        })
      }
    });

    await cache.invalidateUserCache(session.user.id);
    revalidatePath(`/dashboard/recordings/${id}`);
    revalidatePath('/dashboard/recordings');
    revalidatePath('/dashboard');
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
