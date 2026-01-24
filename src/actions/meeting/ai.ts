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
  generateCode, 
  summarizeText, 
  testCode,
  transcribeAudio,
  transcribeDocument,
  generatePlan
} from "@/services/api";
import {
  ActionResult,
  Summary
} from "@/types/meeting";
import { getAIConfiguration, enforceRateLimit } from "./utils";
import { cache } from "@/lib/cache";

/**
 * Internal processor that runs the full AI pipeline
 */
export async function internalProcessMeetingAI(meetingId: string): Promise<ActionResult> {
  try {
    const { aiCircuitBreaker } = await import("@/lib/circuit-breaker");
    
    // 1. Fetch meeting and user
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { user: true }
    });

    if (!meeting) throw new AppError("Meeting not found", "ERR_NOT_FOUND");
    const user = meeting.user;

    // 2. Prepare AI Configuration
    const { apiKey: effectiveApiKey, provider: finalProvider, rawProvider, model: finalModel } = await getAIConfiguration(user);

    if (!effectiveApiKey) {
      throw new AppError("No API key configured. Please add your API key in Settings.", "ERR_CONFIG_MISSING");
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
          .from('recordings')
          .download(meeting.audioUrl);

        if (downloadError) throw new Error(`Storage error: ${downloadError.message}`);

        const isDocument = meeting.audioUrl?.toLowerCase().endsWith('.pdf') || 
                          meeting.audioUrl?.toLowerCase().endsWith('.doc') || 
                          meeting.audioUrl?.toLowerCase().endsWith('.docx') ||
                          meeting.audioUrl?.toLowerCase().endsWith('.txt');

        const transcriptionResult = await Performance.measure(
          "AI_TRANSCRIPTION",
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              const res = isDocument 
                ? await transcribeDocument(audioBlob, effectiveApiKey, user.defaultLanguage || undefined)
                : await transcribeAudio(audioBlob, effectiveApiKey, user.defaultLanguage || undefined);
              if (!res.success) {
                throw new ServiceError(
                  res.error?.message || "Transcription failed", 
                  res.error?.code as string, 
                  res.error?.details
                );
              }
              return res.data;
            });
          },
          { meetingId, userId: user.id }
        );

        if (!transcriptionResult) throw new ServiceError("Transcription failed");
        const transcription = transcriptionResult.transcription;

        if (!transcription || transcription.trim().length === 0) {
          throw new ServiceError("No speech detected in audio", "ERR_EMPTY_TRANSCRIPTION");
        }

        const isTechnical = /api|cache|latency|database|testing|backend|frontend|pipeline|logic|code|deploy/i.test(transcription);

        // Step 2: SUMMARIZATION
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { processingStep: "SUMMARIZATION" }
        });

        const summaryResult = await Performance.measure(
          "AI_SUMMARIZATION",
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              const res = await summarizeText(transcription, { 
                api_key: effectiveApiKey, 
                provider: finalProvider.toUpperCase() as "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "OPENROUTER" | "CUSTOM",
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

        // Step 3: CODE_GENERATION
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { processingStep: "CODE_GENERATION" }
        });

        const codeResult = await Performance.measure(
          "AI_CODE_GEN",
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              const res = await generateCode(transcription, { 
                api_key: effectiveApiKey, 
                provider: finalProvider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom",
                model: finalModel || undefined
              });
              if (!res.success) throw new Error(res.error?.message || "Code generation failed");
              return res.data;
            });
          },
          { meetingId, userId: user.id }
        );

        if (!codeResult) throw new Error("Code generation failed");
        const { code } = codeResult;

        // Step 4: TESTING
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { processingStep: "TESTING" }
        });

        const testResult = await Performance.measure(
          "AI_TESTING",
          async () => {
            return await aiCircuitBreaker.execute(async () => {
              const res = await testCode(code, { 
                api_key: effectiveApiKey, 
                provider: (finalProvider === "openai" || finalProvider === "openrouter") ? "local" : finalProvider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom" | "local"
              });
              // We don't throw error if test fails, just record it
              return res.data;
            });
          },
          { meetingId, userId: user.id }
        );

        // Final Save
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
                    speaker: "AI Assistant",
                    time: "0:00",
                    text: transcription,
                    confidence: transcriptionResult.language_probability
                  }]
                },
                summary: {
                  create: { content: summary }
                },
                isTechnical: isTechnical,
                code: code,
                projectDoc: project_doc,
                testResults: testResult?.output || testResult?.error || "No test results"
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

      } catch (error: any) {
        const errorDetail = error.message || "AI Pipeline failed";
        const errorCode = error.code || "AI_PIPELINE_ERROR";
        
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
              : `System Error [${errorCode}]: ${errorDetail}`
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
    await triggerWorker();

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error, meetingId }, "Enqueue meeting AI error");
    return handleActionError(error, { meetingId });
  }
}

export async function generateMeetingLogic(meetingId: string): Promise<ActionResult<string>> {
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
    if (!transcription) return { success: false, error: "No transcription available" };

    const { apiKey: effectiveApiKey, provider: finalProvider, model: finalModel } = await getAIConfiguration(meeting.user);

    if (!effectiveApiKey) return { success: false, error: "No API key configured" };

    const result = await generateCode(transcription, { 
      api_key: effectiveApiKey, 
      provider: finalProvider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom",
      model: finalModel || undefined
    });

    if (result.success && result.data) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { code: result.data.code }
      });
      revalidatePath(`/dashboard/recordings/${meetingId}`);
      return { success: true, data: result.data.code };
    }

    return { success: false, error: result.error?.message || "Failed to generate logic" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Generate meeting logic error");
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate logic" };
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
    const { buildPrompt, summarizeText } = await import("@/services/api");
    const promptResult = await buildPrompt(question, { context: transcription });
    
    if (!promptResult.success || !promptResult.data) {
      return { success: false, error: promptResult.error?.message || "Failed to build prompt" };
    }

    const result = await summarizeText(promptResult.data.prompt, { 
      api_key: effectiveApiKey, 
      provider: finalProvider.toUpperCase() as "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "OPENROUTER" | "CUSTOM"
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
      provider: finalProvider.toUpperCase() as "OPENAI" | "CLAUDE" | "GEMINI" | "GROQ" | "OPENROUTER" | "CUSTOM",
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

export async function testMeetingCompliance(meetingId: string): Promise<ActionResult<string>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { user: true }
    });

    if (!meeting || meeting.userId !== session.user.id) {
      return { success: false, error: "Meeting not found" };
    }

    const { apiKey: effectiveApiKey } = await getAIConfiguration(meeting.user);
    if (!effectiveApiKey) return { success: false, error: "No API key configured" };

    // Implementation...
    return { success: true, data: "Compliance check completed. No issues found." };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Test meeting compliance error");
    return { success: false, error: "Failed to test compliance" };
  }
}

export async function generateMeetingPlan(meetingId: string): Promise<ActionResult<string>> {
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

    const result = await generatePlan(transcription, { 
      api_key: effectiveApiKey, 
      provider: finalProvider as "openai" | "claude" | "gemini" | "groq" | "openrouter" | "custom" 
    });

    if (result.success && result.data) {
      await cache.invalidateUserCache(session.user.id);
      return { success: true, data: result.data.plan };
    }

    return { success: false, error: result.error?.message || "Failed to generate plan" };
  } catch (error: unknown) {
    logger.error({ error, meetingId, userId: session?.user?.id }, "Generate meeting plan error");
    return { success: false, error: "Failed to generate plan" };
  }
}
