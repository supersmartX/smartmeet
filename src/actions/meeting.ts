"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { encrypt, decrypt } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { headers } from "next/headers";
import { 
  audioToCode, 
  generateCode, 
  summarizeText, 
  buildPrompt, 
  generatePlan,
  testCode
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
  UserSettings
} from "@/types/meeting";

export async function getDashboardStats(): Promise<ActionResult<DashboardStat[]>> {
  noStore();
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
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
        trend: "+12%",
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

    return { success: true, data: stats };
  } catch (error: unknown) {
    console.error("Get dashboard stats error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats" 
    };
  }
}

export async function getMeetings(): Promise<ActionResult<Meeting[]>> {
  noStore();
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meetings = await prisma.meeting.findMany({
      where: {
        user: { email: session.user.email },
      },
      orderBy: {
        date: "desc",
      },
    }) as Meeting[];

    return { success: true, data: meetings };
  } catch (error: unknown) {
    console.error("Get meetings error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch meetings" 
    };
  }
}

export async function getMeetingById(id: string): Promise<ActionResult<MeetingWithRelations>> {
  noStore();
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
    console.error("Get meeting by ID error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch meeting" 
    };
  }
}

/**
 * Update user API key and AI preferences
 */
export async function updateUserApiKey(data: ApiKeyUpdateInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
      lastUsedAt: Date;
    } = {
      lastUsedAt: new Date()
    };

    if (validatedData.apiKey) {
      updatePayload.apiKey = encrypt(validatedData.apiKey);
    } else if (validatedData.apiKey === "") {
      updatePayload.apiKey = null;
    }

    if (validatedData.preferredProvider) updatePayload.preferredProvider = validatedData.preferredProvider;
    if (validatedData.preferredModel) updatePayload.preferredModel = validatedData.preferredModel;
    if (validatedData.allowedIps !== undefined) updatePayload.allowedIps = validatedData.allowedIps;

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

    return { success: true, data: updatedUser };
  } catch (error: unknown) {
    console.error("Update API key error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update API key" 
    };
  }
}

export async function getUserSettings(): Promise<ActionResult<UserSettings>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        apiKey: true,
        preferredProvider: true,
        preferredModel: true,
        allowedIps: true,
        lastUsedAt: true,
        name: true,
        email: true,
        image: true,
        mfaEnabled: true
      },
    });

    if (!user) return { success: false, error: "User not found" };

    const settings = {
      ...user,
      apiKey: user.apiKey ? decrypt(user.apiKey) : null,
      allowedIps: user.allowedIps || ""
    };

    return { success: true, data: settings };
  } catch (error: unknown) {
    console.error("Get user settings error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch user settings" 
    };
  }
}

export async function createMeeting(data: MeetingInput): Promise<ActionResult<Meeting>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const validatedData = meetingSchema.parse(data);

    const meeting = await prisma.meeting.create({
      data: {
        title: validatedData.title,
        duration: validatedData.duration || "0:00",
        status: "PROCESSING",
        code: validatedData.code,
        audioUrl: validatedData.audioUrl,
        user: { connect: { email: session.user.email } },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/recordings");
    return { success: true, data: meeting as unknown as Meeting };
  } catch (error: unknown) {
    console.error("Create meeting error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create meeting" 
    };
  }
}

export async function deleteMeeting(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
          console.error("Storage deletion error:", storageError);
          // We continue anyway to delete the DB record, but log it
        }
      } catch (err) {
        console.error("Storage service error:", err);
      }
    }

    // 3. Delete from database
    await prisma.meeting.delete({
      where: {
        id: validatedId,
        user: { email: session.user.email },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/recordings");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete meeting error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete meeting" 
    };
  }
}

export async function updateMeetingTitle(id: string, title: string): Promise<ActionResult<Meeting>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
    return { success: true, data: meeting as unknown as Meeting };
  } catch (error: unknown) {
    console.error("Update meeting title error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update meeting title" 
    };
  }
}

export async function updateMeetingCode(id: string, code: string): Promise<ActionResult<Meeting>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
    return { success: true, data: meeting as unknown as Meeting };
  } catch (error: unknown) {
    console.error("Update meeting code error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update meeting code" 
    };
  }
}

export async function createSignedUploadUrl(fileName: string): Promise<ActionResult<{ signedUrl: string; path: string; token: string }>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
    console.error("Create signed upload URL error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create upload URL" 
    };
  }
}

export async function processMeetingAI(meetingId: string): Promise<ActionResult> {
  const session = await getServerSession(enhancedAuthOptions);
  if (!session?.user?.email) return { success: false, error: "Unauthorized" };

  try {
    // 1. Get meeting and user details
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        user: {
          select: { 
            id: true, 
            apiKey: true, 
            allowedIps: true,
            preferredProvider: true,
            preferredModel: true
          }
        }
      }
    });

    if (!meeting || !meeting.user) return { success: false, error: "Meeting or user not found" };
    const user = meeting.user;

    // 2. Check IP Restriction if enabled
    if (user.allowedIps) {
      const headerList = await headers();
      const clientIp = headerList.get("x-forwarded-for")?.split(',')[0] || 
                      headerList.get("x-real-ip") || 
                      "unknown";

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

        return { success: false, error: `Unauthorized IP: ${clientIp}. Please update your settings if this is you.` };
      }
    }

    if (!user.apiKey) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: "FAILED" }
      });
      return { success: false, error: "API Key missing. Please add it in Settings." };
    }

    const apiKey = decrypt(user.apiKey);

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
    const rawProvider = user.preferredProvider?.toLowerCase() || "openai";
    
    // Map frontend provider names to backend expectations
    const providerMap: Record<string, string> = {
      "anthropic": "claude",
      "google": "gemini",
      "openai": "openai",
      "groq": "groq"
    };
    
    const provider = providerMap[rawProvider] || rawProvider;
    
    const pipelineResponse = await audioToCode(audioBlob, {
      api_key: apiKey,
      summary_provider: provider.toUpperCase() as any,
      code_provider: provider as any,
      test_provider: provider === "openai" ? "local" : provider as any 
    });

    if (pipelineResponse.success && pipelineResponse.data) {
      await updateMeetingStatus(meetingId, "COMPLETED", {
        transcription: pipelineResponse.data.transcription,
        summary: pipelineResponse.data.summary,
        code: pipelineResponse.data.code,
        projectDoc: pipelineResponse.data.project_doc,
        testResults: pipelineResponse.data.test_output?.output || pipelineResponse.data.test_output?.error
      });
      return { success: true };
    } else {
      const errorDetail = pipelineResponse.error || pipelineResponse.message || "AI Pipeline failed";
      console.error("Pipeline failure details:", errorDetail);
      
      // Update status with error details if possible
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { 
          status: "FAILED",
          testResults: `Pipeline Error: ${errorDetail}. Provider used: ${provider}`
        }
      });
      
      return { success: false, error: errorDetail };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process meeting with AI";
    console.error("Process meeting AI error:", errorMessage);
    
    // Ensure we update the status even on catch
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { 
        status: "FAILED",
        testResults: `System Error: ${errorMessage}`
      }
    });
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function updateMeetingStatus(id: string, status: "COMPLETED" | "PROCESSING" | "FAILED", data?: MeetingUpdateData): Promise<ActionResult<Meeting>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const updateData: {
      status: "COMPLETED" | "PROCESSING" | "FAILED";
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
    console.error("Update meeting status error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update meeting status" 
    };
  }
}

export async function getAuditLogs(): Promise<ActionResult<AuditLog[]>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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

    return { success: true, data: logs as unknown as AuditLog[] };
  } catch (error: unknown) {
    console.error("Get audit logs error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch audit logs" 
    };
  }
}

export async function getActiveSessions(): Promise<ActionResult<Session[]>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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

    return { success: true, data: sessions as unknown as Session[] };
  } catch (error: unknown) {
    console.error("Get active sessions error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch active sessions" 
    };
  }
}

export async function generateMeetingLogic(meetingId: string): Promise<ActionResult<string>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
    const apiKey = decrypt(user.apiKey);

    const transcriptText = meeting.transcripts.map(t => `${t.speaker}: ${t.text}`).join("\n");
    
    const result = await generateCode(
      `Based on this meeting transcript, generate a structured business logic or implementation plan in TypeScript:\n\n${transcriptText}`,
      {
        api_key: apiKey,
        provider: (user.preferredProvider as "openai" | "claude" | "gemini" | "groq") || "openai"
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
    console.error("Generate meeting logic error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate logic" };
  }
}

export async function askAIAboutMeeting(meetingId: string, question: string): Promise<ActionResult<string>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
    const apiKey = decrypt(user.apiKey);

    const context = `
      Meeting Title: ${meeting.title}
      Summary: ${meeting.summary?.content || "No summary available"}
      Transcript: ${meeting.transcripts.slice(0, 50).map(t => `${t.speaker}: ${t.text}`).join("\n")}
    `;

    // Use buildPrompt or generatePlan based on the question type or just a general summary call
    const result = await buildPrompt(
      `Context: ${context}\n\nQuestion: ${question}\n\nProvide a concise and helpful answer based on the meeting context.`,
      apiKey
    );

    if (result.success && result.data) {
      return { success: true, data: result.data.prompt };
    }

    return { success: false, error: result.error || "AI failed to answer" };
  } catch (error: unknown) {
    console.error("Ask AI error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to get AI answer" };
  }
}

export async function revokeSession(sessionId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
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
    console.error("Revoke session error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to revoke session" 
    };
  }
}

export async function generateMeetingSummary(meetingId: string): Promise<ActionResult<Summary>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId, user: { email: session.user.email } },
      include: { transcripts: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { apiKey: true }
    });

    if (!user?.apiKey) return { success: false, error: "API Key missing" };
    const apiKey = decrypt(user.apiKey);

    const transcriptText = meeting.transcripts.map(t => `${t.speaker}: ${t.text}`).join("\n");
    
    const result = await summarizeText(transcriptText, { api_key: apiKey });

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
    console.error("Generate meeting summary error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate summary" };
  }
}

export async function testMeetingCompliance(meetingId: string): Promise<ActionResult<string>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId, user: { email: session.user.email } },
      select: { code: true }
    });

    if (!meeting || !meeting.code) return { success: false, error: "Meeting logic not found. Generate logic first." };
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { apiKey: true }
    });

    if (!user?.apiKey) return { success: false, error: "API Key missing" };
    const apiKey = decrypt(user.apiKey);

    const result = await testCode(meeting.code, { api_key: apiKey });

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
    console.error("Test meeting compliance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to run compliance tests" };
  }
}

export async function generateMeetingPlan(meetingId: string): Promise<ActionResult<string>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId, user: { email: session.user.email } },
      include: { transcripts: true }
    });

    if (!meeting) return { success: false, error: "Meeting not found" };
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { apiKey: true }
    });

    if (!user?.apiKey) return { success: false, error: "API Key missing" };
    const apiKey = decrypt(user.apiKey);

    const transcriptText = meeting.transcripts.map(t => `${t.speaker}: ${t.text}`).join("\n");
    
    const result = await generatePlan(
      `Generate a detailed implementation plan based on this meeting transcript:\n\n${transcriptText}`,
      apiKey
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
    console.error("Generate meeting plan error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate plan" };
  }
}
