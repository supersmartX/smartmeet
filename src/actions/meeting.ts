"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      _count: {
        select: { meetings: true },
      },
    },
  });

  if (!user) return null;

  // In a real app, you'd calculate these from the database
  return [
    { 
      label: "Total Meetings", 
      value: user._count.meetings.toString(), 
      icon: "Video", 
      color: "text-brand-via", 
      bg: "bg-brand-via/10", 
      trend: "0%", 
      href: "/dashboard/recordings" 
    },
    { 
      label: "AI Insights", 
      value: "0", 
      icon: "Sparkles", 
      color: "text-amber-500", 
      bg: "bg-amber-500/10", 
      trend: "0%", 
      href: "/dashboard/recordings?filter=action+items" 
    },
    { 
      label: "Time Saved", 
      value: "0h", 
      icon: "Zap", 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/10", 
      trend: "0%", 
      href: "/dashboard/recordings" 
    },
    { 
      label: "Compliance Score", 
      value: "0%", 
      icon: "ShieldCheck", 
      color: "text-blue-500", 
      bg: "bg-blue-500/10", 
      trend: "0%", 
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

export async function createMeeting(data: { title: string; duration?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const meeting = await prisma.meeting.create({
    data: {
      title: data.title,
      duration: data.duration || "0:00",
      status: "PROCESSING",
      user: { connect: { email: session.user.email } },
    },
  });

  revalidatePath("/dashboard");
  return meeting;
}
