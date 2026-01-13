"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import logger from "@/lib/logger";
import { ActionResult } from "@/types/meeting";
import { checkApiRateLimit } from "@/lib/rate-limit";

export interface SearchResult {
  meetings: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: Date;
    isPinned: boolean;
    isFavorite: boolean;
  }>;
  navigation: Array<{
    title: string;
    href: string;
    type: string;
  }>;
}

export async function globalSearch(query: string): Promise<ActionResult<SearchResult>> {
  let session;
  try {
    session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    // Rate limiting
    const rateLimit = await checkApiRateLimit(`search:${session.user.id}`);
    if (!rateLimit.allowed) {
      return { 
        success: false, 
        error: `Too many search requests. Please try again in ${rateLimit.retryAfter} seconds.` 
      };
    }

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
  } catch (error: unknown) {
    logger.error({ error, userId: session?.user?.id, query }, "Global search error");
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to perform search" 
    };
  }
}
