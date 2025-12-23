"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { encrypt, decrypt } from "@/lib/crypto";

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
  });

  if (!user) return null;

  const totalMeetings = user._count.meetings;
  const aiInsightsCount = user.meetings.reduce((acc: number, meeting: any) => {
    return acc + (meeting._count?.actionItems ?? 0) + (meeting.summary ? 1 : 0);
  }, 0);

  // Heuristic: Each meeting saves ~30 mins of manual note taking/reviewing
  const timeSavedHours = (totalMeetings * 0.5).toFixed(1);

  const complianceScore = totalMeetings > 0 
    ? Math.round((user.meetings.filter((m: any) => m.summary || m._count.actionItems > 0).length / totalMeetings) * 100)
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
  ];
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
  });
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
  });
}

export async function updateUserApiKey(apiKey: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const encryptedKey = encrypt(apiKey);

  return await prisma.user.update({
    where: { email: session.user.email },
    data: { apiKey: encryptedKey },
  });
}

export async function getUserApiKey() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { apiKey: true },
  });

  if (!user?.apiKey) return null;
  
  return decrypt(user.apiKey);
}

export async function createMeeting(data: { title: string; duration?: string; code?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const meeting = await (prisma.meeting as any).create({
    data: {
      title: data.title,
      duration: data.duration || "0:00",
      status: "PROCESSING",
      code: data.code,
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

  return await (prisma.meeting as any).update({
    where: {
      id,
      user: { email: session.user.email },
    },
    data: { code },
  });
}
