import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import logger from "@/lib/logger";
import { ApiErrorCode, createErrorResponse } from "@/lib/api-response";

/**
 * Real-time status update route for meetings using Server-Sent Events (SSE)
 * Allows the frontend to receive updates on meeting processing status without polling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.UNAUTHORIZED, "Unauthorized"),
        { status: 401 }
      );
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id },
      select: { userId: true, status: true }
    });

    if (!meeting) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.NOT_FOUND, "Meeting not found"),
        { status: 404 }
      );
    }

    // Verify ownership
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user || meeting.userId !== user.id) {
      return NextResponse.json(
        createErrorResponse(ApiErrorCode.FORBIDDEN, "Access denied"),
        { status: 403 }
      );
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let lastStatus = meeting.status;
        
        // Initial status send
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: lastStatus })}\n\n`));

        // Poll for changes
        const interval = setInterval(async () => {
          try {
            const currentMeeting = await prisma.meeting.findUnique({
              where: { id },
              select: { status: true, processingStep: true }
            });

            if (!currentMeeting) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Meeting deleted" })}\n\n`));
              clearInterval(interval);
              controller.close();
              return;
            }

            if (currentMeeting.status !== lastStatus) {
              lastStatus = currentMeeting.status;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                status: currentMeeting.status,
                processingStep: currentMeeting.processingStep 
              })}\n\n`));

              // If completed or failed, we can close the connection after a short delay
              if (currentMeeting.status === "COMPLETED" || currentMeeting.status === "FAILED") {
                setTimeout(() => {
                  try {
                    clearInterval(interval);
                    controller.close();
                  } catch {
                    // Ignore if already closed
                  }
                }, 5000);
              }
            }
          } catch (error) {
            logger.error({ error, meetingId: id }, "SSE status update error");
            clearInterval(interval);
            controller.close();
          }
        }, 3000); // Check every 3 seconds

        // Cleanup on connection close
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
        });
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    logger.error({ error, meetingId: id }, "Real-time status route error");
    return NextResponse.json(
      createErrorResponse(ApiErrorCode.INTERNAL_ERROR, "Internal server error"),
      { status: 500 }
    );
  }
}
