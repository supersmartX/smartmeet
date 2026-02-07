import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import logger from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // 1. Check Authentication
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate Path (Prevent Traversal)
    if (path.includes("..") || path.startsWith("/") || path.includes("://")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // 3. Fetch from Backend
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://api.supersmartx.com:8000";
    const fileUrl = `${baseUrl}/${path}`;

    logger.info({ fileUrl, userId: session.user.id }, "Proxying download request");

    const response = await fetch(fileUrl);

    if (!response.ok) {
      logger.error({ status: response.status, fileUrl }, "Backend download failed");
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` }, 
        { status: response.status }
      );
    }

    // 4. Stream Response
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition");

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    logger.error({ error }, "Download proxy error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
