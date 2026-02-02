"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notification";
import { logSecurityEvent } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase";
import { enqueueTask } from "@/lib/queue";
import { ServiceError, AuthError, AppError } from "@/lib/errors";
import { handleActionError } from "@/lib/error-handler";
import logger from "@/lib/logger";
import { Performance } from "@/lib/performance";
import { 
  summarizeText, 
  transcribeAudio,
  transcribeDocument
} from "@/services/api";
import {
  ActionResult,
  Summary
} from "@/types/meeting";
import { getAIConfiguration, enforceRateLimit } from "./utils";
import { normalizeProvider } from "@/lib/utils";
import { cache } from "@/lib/cache";
import { env } from "@/lib/env";
import { v4 as uuidv4 } from "uuid";

/**
 * Internal processor that runs the full AI pipeline
 */
export async function internalProcessMeetingAI(meetingId: string): Promise<ActionResult> {
  try {
    const { getProviderBreaker } = await import("@/lib/circuit-breaker");
    
    // 1. Fetch meeting and user
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { user: true }
    });

    if (!meeting) throw new AppError("Meeting not found", "ERR_NOT_FOUND");
    const user = meeting.user;

    // 2. Prepare AI Configuration
    let effectiveApiKey, finalProvider;
    try {
      const config = await getAIConfiguration(user);
      effectiveApiKey = config.apiKey;
      finalProvider = config.provider;
    } catch (configError) {
      logger.error({ configError, userId: user.id }, "AI Configuration failed");
      throw new AppError(
        configError instanceof Error ? configError.message : "Invalid AI Configuration", 
        "ERR_CONFIG_INVALID"
      );
    }

    // 3. Check Storage Configuration
    if (!supabaseAdmin) {
      throw new ServiceError("Storage service (Supabase) is not configured correctly.", "ERR_STORAGE_CONFIG");
    }

    try {
        // Step 1: TRANSCRIPTION
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { 
            status: "PROCESSING",
            processingStep: "TRANSCRIPTION" 
          }
        });

        // Download from Supabase
        if (!supabaseAdmin) throw new Error("Storage service not configured");
        if (!meeting.audioUrl) throw new AppError("Audio file path missing", "ERR_FILE_NOT_FOUND");
        
        const { data: audioBlob, error: downloadError } = await supabaseAdmin
          .storage
          .from(env.SUPABASE_STORAGE_BUCKET)
          .download(meeting.audioUrl);

        if (downloadError) throw new Error(`Storage error: ${downloadError.message}`);

        const isDocument = meeting.audioUrl?.toLowerCase().endsWith('.pdf') || 
                          meeting.audioUrl?.toLowerCase().endsWith('.doc') || 
                          meeting.audioUrl?.toLowerCase().endsWith('.docx') ||
                          meeting.audioUrl?.toLowerCase().endsWith('.txt');

        let transcription = "";

        if (meeting.audioUrl?.toLowerCase().endsWith('.txt')) {
          // If it's a TXT file, we can use the content directly
          try {
            const text = await audioBlob.text();
            transcription = text;
          } catch (textError) {
            logger.warn({ textError, meetingId }, "Failed to get text via .text(), trying toString()");
            transcription = audioBlob.toString();
          }
          
          // Fallback if we still don't have good text
          if (!transcription || transcription.includes('[object') || transcription.length === 0) {
            // Last resort: try reading as arrayBuffer then decoder
            const buffer = await audioBlob.arrayBuffer();
            const decoder = new TextDecoder('utf-8');
            transcription = decoder.decode(buffer);
          }
        } else {
          const transcriptionResult = await Performance.measure(
            "AI_TRANSCRIPTION",
            async () => {
              return await getProviderBreaker(finalProvider).execute(async () => {
                logger.info({ meetingId, provider: finalProvider, isDocument }, "Triggering AWS transcription");
                const res = isDocument 
                  ? await transcribeDocument(audioBlob, effectiveApiKey || undefined, user.defaultLanguage || undefined)
                  : await transcribeAudio(
                      new File([audioBlob], meeting.audioUrl?.split('/').pop() || 'audio.mp3', { type: audioBlob.type || 'audio/mpeg' }),
                      "", // Backend uses its own Deepgram key
                      user.defaultLanguage || undefined
                    );
                
                if (!res.success) {
                  logger.error({ error: res.error, meetingId }, "AWS transcription failed");
                  throw new ServiceError(
                    res.error?.message || "Transcription failed", 
                    res.error?.code as string, 
                    res.error?.details
                  );
                }
                logger.info({ meetingId }, "AWS transcription completed successfully");
                return res.data;
              });
            },
            { meetingId, userId: user.id }
          );

          if (!transcriptionResult) throw new ServiceError("Transcription failed");
          transcription = transcriptionResult.transcription;
        }

        if (!transcription || transcription.trim().length === 0) {
          throw new ServiceError("No content detected in file", "ERR_EMPTY_TRANSCRIPTION");
        }

        // Step 1.5: Save transcription to database immediately
        // This ensures we have the transcript even if summarization fails later
        await prisma.transcript.deleteMany({ where: { meetingId: meeting.id } });
        await prisma.transcript.create({
          data: {
            meetingId: meeting.id,
            text: transcription,
            speaker: isDocument ? "Document Content" : "Audio Transcript",
            time: "0:00",
            confidence: 1.0
          }
        });

        // Step 2: SUMMARIZATION
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { processingStep: "SUMMARIZATION" }
        });

        const summaryResult = await Performance.measure(
          "AI_SUMMARIZATION",
          async () => {
            return await getProviderBreaker(finalProvider).execute(async () => {
              const res = await summarizeText(transcription, { 
                api_key: effectiveApiKey || undefined, 
                provider: normalizeProvider(finalProvider, 'upper') as "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "CUSTOM",
                summary_length: user.summaryLength || undefined,
                summary_persona: user.summaryPersona || undefined,
                language: user.defaultLanguage || undefined
              });
              if (!res.success) throw new Error(res.error?.message || "Summarization failed");
              return res.data;
            });
          },
          { meetingId, userId: user.id }
        );

        if (!summaryResult) throw new Error("Summarization failed");
        const { summary, project_doc } = summaryResult;

        // Step 3: Final Save
        await Performance.measure(
          "DB_FINAL_SAVE",
          async () => {
            await prisma.meeting.update({
              where: { id: meetingId },
              data: {
                status: "COMPLETED",
                processingStep: "COMPLETED",
                transcripts: {
                  deleteMany: {},
                  create: [{
                    speaker: isDocument ? "Document Content" : "Audio Transcript",
                    time: "0:00",
                    text: transcription,
                    confidence: 1.0
                  }]
                },
                summary: {
                  create: { content: summary }
                },
                isTechnical: false, // Force non-technical as we removed technical processing
                projectDoc: project_doc // Keep basic project doc if generated by summary
              }
            });
          },
          { meetingId, userId: user.id }
        );

        await logSecurityEvent(
          "MEETING_PROCESSING_SUCCESS",
          user.id,
          `Meeting "${meeting.title}" processed successfully`,
          "Meeting"
        );

        // Send success notification
        await createNotification(user.id, {
          title: "Processing Complete",
          message: `Your meeting "${meeting.title}" has been successfully processed.`,
          type: "SUCCESS",
          link: `/dashboard/recordings/${meetingId}`
        });

        await cache.invalidateUserCache(user.id);

        return { success: true };

      } catch (error: unknown) {
        const errorDetail = error instanceof Error ? error.message : "AI Pipeline failed";
        
        logger.error({ error, meetingId, userId: user.id }, "Pipeline failure details");
        
        const breakerState = await getProviderBreaker(finalProvider).getState();
        const isBreakerOpen = breakerState === "OPEN";

        // Get the last successful step to identify where it failed
        const currentMeeting = await prisma.meeting.findUnique({ 
            where: { id: meetingId },
            select: { processingStep: true } 
        });
        const failedStep = currentMeeting?.processingStep || "UNKNOWN";

        await prisma.meeting.update({
          where: { id: meetingId },
          data: { 
            status: "FAILED",
            processingStep: "FAILED",
            testResults: isBreakerOpen 
              ? "Service temporarily unavailable due to multiple previous failures. Please try again in a minute."
              : `Pipeline Failed at ${failedStep}: ${errorDetail}`
          }
        });

        await cache.invalidateUserCache(user.id);
        
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
              : undefined
        };
      }
  } catch (error: unknown) {
    logger.error({ error, meetingId }, "Internal process AI fatal error");
    
    // Attempt to update meeting status to FAILED so user knows what happened
    try {
      const errorDetail = error instanceof Error ? error.message : "Critical system error during initialization";
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { 
          status: "FAILED", 
          processingStep: "FAILED",
          testResults: `System Error: ${errorDetail}`
        }
      });
    } catch (dbError) {
      logger.error({ dbError, meetingId }, "Failed to update meeting status during fatal error recovery");
    }

    return handleActionError(error, { meetingId });
  }
}

export async function processMeetingAI(meetingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) throw new AuthError();

    // Apply rate limiting
    await enforceRateLimit("api");

    // Check if meeting belongs to user
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { userId: true, status: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      throw new AppError("Meeting not found", "ERR_NOT_FOUND");
    }

    if (meeting.status === "PROCESSING") {
      throw new AppError("Meeting is already being processed", "ERR_ALREADY_PROCESSING");
    }

    // Call internal processor
    return await internalProcessMeetingAI(meetingId);
  } catch (error: unknown) {
    logger.error({ error, meetingId }, "Process meeting AI error");
    return handleActionError(error, { meetingId });
  }
}

export async function enqueueMeetingAI(meetingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) throw new AuthError();

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { userId: true, title: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      throw new AppError("Meeting not found", "ERR_NOT_FOUND");
    }

    const { v4: uuidv4 } = await import("uuid");
    await enqueueTask({ 
      id: uuidv4(),
      type: "PROCESS_MEETING_AI", 
      data: { meetingId } 
    });

    const { triggerWorker } = await import("./utils");
    await triggerWorker(meetingId);

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, meetingId }, "Enqueue meeting AI error");
    return handleActionError(error, { meetingId });
  }
}

export async function askAIAboutMeeting(meetingId: string, question: string): Promise<ActionResult<string>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { 
        transcripts: true,
        user: true 
      }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    const transcription = meeting.transcripts.map(t => t.text).join("\n");
    const { apiKey: effectiveApiKey, provider: finalProvider } = await getAIConfiguration(meeting.user);

    if (!effectiveApiKey) return { success: false, error: "No API key configured" };

    // Custom implementation or use service
    const { summarizeText } = await import("@/services/api");
    
    // Build prompt locally to avoid 404 from missing /api/AI/prompt/build endpoint
    const prompt = `Context:\n${transcription}\n\nQuestion: ${question}\n\nAnswer the question based on the context provided.`;

    const result = await summarizeText(prompt, { 
      api_key: effectiveApiKey, 
      provider: finalProvider.toUpperCase() as "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "CUSTOM"
    });

    if (result.success && result.data) {
      return { success: true, data: result.data.summary };
    }

    return { success: false, error: result.error?.message || "Failed to get AI answer" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Ask AI error");
    return { success: false, error: "Failed to process question" };
  }
}

export async function generateMeetingSummary(meetingId: string): Promise<ActionResult<Summary>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { 
        transcripts: true,
        user: true 
      }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    const transcription = meeting.transcripts.map(t => t.text).join("\n");
    const { apiKey: effectiveApiKey, provider: finalProvider } = await getAIConfiguration(meeting.user);

    if (!effectiveApiKey) return { success: false, error: "No API key configured" };

    const result = await summarizeText(transcription, { 
      api_key: effectiveApiKey, 
      provider: finalProvider.toUpperCase() as "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "CUSTOM",
      summary_length: meeting.user.summaryLength || undefined,
      summary_persona: meeting.user.summaryPersona || undefined,
      language: meeting.user.defaultLanguage || undefined
    });

    if (result.success && result.data) {
      const summary = await prisma.summary.upsert({
        where: { meetingId },
        create: {
          meetingId,
          content: result.data.summary
        },
        update: {
          content: result.data.summary
        }
      });

      revalidatePath(`/dashboard/recordings/${meetingId}`);
      await cache.invalidateUserCache(session.user.id);
      return { success: true, data: summary as Summary };
    }

    return { success: false, error: result.error?.message || "Failed to generate summary" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Generate meeting summary error");
    return { success: false, error: "Failed to generate summary" };
  }
}

export async function retryStuckMeeting(meetingId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) throw new AuthError();

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { userId: true, status: true, updatedAt: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      throw new AppError("Meeting not found", "ERR_NOT_FOUND");
    }

    // Allow retry if it's FAILED or if it's PROCESSING but updated > 2 mins ago
    // 2 minutes is safe because our worker now timeouts at 50s.
    const isStuck = meeting.status === "PROCESSING" && (Date.now() - meeting.updatedAt.getTime() > 2 * 60 * 1000);
    
    if (meeting.status !== "FAILED" && !isStuck) {
       return { success: false, error: "Meeting is currently processing. Please wait." };
    }

    // Reset to PENDING first to clear any locks
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "PENDING", processingStep: "IDLE", updatedAt: new Date() }
    });

    // Enqueue it again
    await enqueueTask({
        id: uuidv4(),
        type: "PROCESS_MEETING_AI",
        data: { meetingId }
    });
    
    // Trigger worker
    const { triggerWorker } = await import("./utils");
    await triggerWorker(meetingId);
    
    await cache.invalidateUserCache(session.user.id);
    revalidatePath(`/dashboard/recordings/${meetingId}`);

    return { success: true };
  } catch (error: unknown) {
     return handleActionError(error, { meetingId });
  }
}
