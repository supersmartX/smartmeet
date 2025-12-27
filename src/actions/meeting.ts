"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/crypto";
import { logSecurityEvent } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { headers } from "next/headers";
import { audioToCode } from "@/services/api";

interface DashboardStat {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
  trend: string;
  href: string;
}

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration?: string;
  participants?: number;
  status: string;
  userId: string;
  code?: string;
  audioUrl?: string;
}

interface MeetingWithRelations extends Meeting {
  transcripts: Transcript[];
  summary?: Summary;
  actionItems: ActionItem[];
}

interface Transcript {
  id: string;
  speaker: string;
  time: string;
  text: string;
  meetingId: string;
}

interface Summary {
  id: string;
  content: string;
  meetingId: string;
}

interface ActionItem {
  id: string;
  title: string;
  status: string;
  meetingId: string;
}

interface UserWithMeetings {
  id: string;
  email: string;
  _count: {
    meetings: number;
  };
  meetings: Array<{
    id: string;
    _count: {
      actionItems: number;
    };
    summary?: Summary;
  }>;
}

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

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

  if (!user) return null;

  const totalMeetings = user._count.meetings;
  const aiInsightsCount = user.meetings.reduce((acc: number, meeting) => {
    return acc + (meeting._count?.actionItems ?? 0) + (meeting.summary ? 1 : 0);
  }, 0);

  // Heuristic: Each meeting saves ~30 mins of manual note taking/reviewing
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
      label: "Compliance Score",
      value: `${complianceScore}%`,
      icon: "ShieldCheck",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: complianceScore > 90 ? "Stable" : "Improving",
      href: "/dashboard/recordings"
    },
  ] as DashboardStat[];
}

export async function getMeetings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return [];

  return await prisma.meeting.findMany({
    where: {
      user: { email: session.user.email },
    },
    orderBy: {
      date: "desc",
    },
  }) as Meeting[];
}

export async function getMeetingById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return await prisma.meeting.findUnique({
    where: {
      id,
      user: { email: session.user.email },
    },
    include: {
      transcripts: true,
      summary: true,
      actionItems: true,
    },
  }) as MeetingWithRelations | null;
}

/**
 * Update user API key and AI preferences
 */
export async function updateUserApiKey(apiKey: string, preferredProvider?: string, preferredModel?: string, allowedIps?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) throw new Error("User not found");

  const encryptedKey = apiKey ? encrypt(apiKey) : undefined;

  const data: any = {};
  if (encryptedKey !== undefined) data.apiKey = encryptedKey;
  if (preferredProvider) data.preferredProvider = preferredProvider;
  if (preferredModel) data.preferredModel = preferredModel;
  if (allowedIps !== undefined) data.allowedIps = allowedIps;
  data.lastUsedAt = new Date();

  const updatedUser = await (prisma.user.update as any)({
    where: { email: session.user.email },
    data,
  });

  // Log the security event
  await logSecurityEvent(
    "API_KEY_UPDATED",
    user.id,
    `Provider: ${preferredProvider || 'unchanged'}, Model: ${preferredModel || 'unchanged'}, IP Restriction: ${allowedIps ? 'enabled' : 'disabled'}`,
    "Settings"
  );

  return updatedUser;
}

export async function getUserSettings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

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
    } as any,
  });

  if (!user) return null;

  return {
    ...user,
    apiKey: (user as any).apiKey ? decrypt((user as any).apiKey as string) : null,
    allowedIps: (user as any).allowedIps || ""
  };
}

interface CreateMeetingData {
  title: string;
  duration?: string;
  code?: string;
  audioUrl?: string;
}

export async function createMeeting(data: CreateMeetingData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const meeting = await prisma.meeting.create({
    data: {
      title: data.title,
      duration: data.duration || "0:00",
      status: "PROCESSING",
      code: data.code,
      audioUrl: data.audioUrl,
      user: { connect: { email: session.user.email } },
    },
  });

  revalidatePath("/dashboard");
  return meeting;
}

export async function deleteMeeting(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  await prisma.meeting.delete({
    where: {
      id,
      user: { email: session.user.email },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/recordings");
  return { success: true };
}

export async function updateMeetingTitle(id: string, title: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  return await prisma.meeting.update({
    where: {
      id,
      user: { email: session.user.email },
    },
    data: { title },
  });
}

export async function updateMeetingCode(id: string, code: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  return await prisma.meeting.update({
    where: {
      id,
      user: { email: session.user.email },
    },
    data: { code },
  });
}

export async function createSignedUploadUrl(fileName: string, _fileType: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) throw new Error("User not found");
  if (!supabaseAdmin) throw new Error("Supabase Admin not configured");

  const fileExt = fileName.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExt}`;
  const filePath = `private/${user.id}/${uniqueFileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from('recordings')
    .createSignedUploadUrl(filePath);

  if (error) throw new Error(error.message);

  return {
    signedUrl: data.signedUrl,
    path: filePath,
    token: data.token
  };
}

export async function processMeetingAI(meetingId: string, audioUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  try {
    // 1. Get the user's API key and IP restrictions
    const user = (await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, apiKey: true, allowedIps: true } as any
    })) as any;

    if (!user) throw new Error("User not found");

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
        
        throw new Error(`Unauthorized IP: ${clientIp}. Please update your settings if this is you.`);
      }
    }

    if (!user?.apiKey) {
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: "FAILED" }
      });
      throw new Error("API Key missing. Please add it in Settings.");
    }

    const apiKey = decrypt(user.apiKey);

    // Update lastUsedAt
    await (prisma.user.update as any)({
      where: { id: user.id },
      data: { lastUsedAt: new Date() }
    });

    // 2. Download the file from Supabase to send to the AI API
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new Error("Failed to download audio from storage");
    
    const audioBlob = await audioResponse.blob();

    // 3. Call the AI pipeline
    const pipelineResponse = await audioToCode(audioBlob, {
      api_key: apiKey
    });

    if (pipelineResponse.success && pipelineResponse.data) {
      await updateMeetingStatus(meetingId, "COMPLETED", {
        transcription: pipelineResponse.data.transcription,
        summary: pipelineResponse.data.summary,
        code: pipelineResponse.data.code
      });
      return { success: true };
    } else {
      console.error("Pipeline failed:", pipelineResponse.error);
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: "FAILED" }
      });
      return { success: false, error: pipelineResponse.error };
    }
  } catch (error) {
    console.error("AI Processing Error:", error);
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: "FAILED" }
    });
    throw error;
  }
}

export async function updateMeetingStatus(id: string, status: "COMPLETED" | "PROCESSING" | "FAILED", data?: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const updateData: any = { status };
  
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
  }

  const meeting = await prisma.meeting.update({
    where: { id, user: { email: session.user.email } },
    data: updateData
  });

  revalidatePath("/dashboard/recordings");
  revalidatePath(`/dashboard/recordings/${id}`);
  
  return meeting;
}

export async function getAuditLogs() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) throw new Error("User not found");

  return prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

export async function getActiveSessions() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) throw new Error("User not found");

  return prisma.session.findMany({
    where: { userId: user.id, expires: { gt: new Date() } },
    orderBy: { expires: "desc" },
    select: {
      id: true,
      expires: true,
      userAgent: true,
      ipAddress: true,
      sessionToken: true
    } as any
  });
}

export async function revokeSession(sessionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) throw new Error("User not found");

  // Only allow revoking sessions that belong to the current user
  const targetSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true }
  });

  if (!targetSession || targetSession.userId !== user.id) {
    throw new Error("Session not found or unauthorized");
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
}