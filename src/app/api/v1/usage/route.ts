import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from "@/lib/api-response";
import { PLAN_CONFIGS } from "@/lib/quota";

export async function GET() {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.UNAUTHORIZED, "Unauthorized"),
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        meetingsUsed: true,
        meetingQuota: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.NOT_FOUND, "User not found"),
        { status: 404 }
      );
    }

    const planLimits = PLAN_CONFIGS[user.plan as keyof typeof PLAN_CONFIGS];
    
    // In a real app, we would track token usage in a separate table
    // For now, we return the plan limits and user's current meeting usage
    const usageData = {
      plan: user.plan,
      meetingUsage: {
        used: user.meetingsUsed,
        limit: user.meetingQuota,
        dailyLimit: planLimits.dailyMeetingLimit,
        percentage: Math.min((user.meetingsUsed / user.meetingQuota) * 100, 100),
      },
      tokenUsage: {
        used: 0, // Placeholder
        limit: planLimits.monthlyTokenLimit,
        percentage: 0,
      },
      features: planLimits.features,
      limits: {
        maxFileSizeMb: planLimits.maxFileSizeMb,
      }
    };

    return NextResponse.json(createSuccessResponse(usageData));
  } catch (error) {
    console.error("[USAGE_API_ERROR]", error);
    return NextResponse.json(
      createErrorResponse(ApiErrorCode.INTERNAL_ERROR, "Failed to fetch usage data"),
      { status: 500 }
    );
  }
}
