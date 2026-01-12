"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";

export async function globalSearch(query: string) {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const q = query.toLowerCase();

    // Search meetings
    const meetings = await prisma.meeting.findMany({
      where: {
        user: { email: session.user.email },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { summary: { content: { contains: q, mode: 'insensitive' } } },
          { transcripts: { some: { text: { contains: q, mode: 'insensitive' } } } }
        ]
      },
      include: {
        summary: true
      },
      take: 8,
      orderBy: [
        { isPinned: 'desc' },
        { isFavorite: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return { 
      success: true, 
      data: {
        meetings: meetings.map(m => ({
          id: m.id,
          title: m.title,
          type: 'recording',
          createdAt: m.createdAt,
          isPinned: m.isPinned,
          isFavorite: m.isFavorite
        })),
        navigation: [
          { title: 'Dashboard', href: '/dashboard', type: 'nav' },
          { title: 'Recordings', href: '/dashboard/recordings', type: 'nav' },
          { title: 'Settings', href: '/dashboard/settings', type: 'nav' },
          { title: 'Help & Support', href: '/dashboard/help', type: 'nav' }
        ].filter(n => n.title.toLowerCase().includes(q))
      }
    };
  } catch (error) {
    console.error("Global search error:", error);
    return { success: false, error: "Failed to perform search" };
  }
}
