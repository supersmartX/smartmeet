import { testDatabaseConnection, testOAuthDatabaseOperations } from "@/lib/test-db";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import { NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse, ApiErrorCode } from "@/lib/api-response";

export async function GET() {
  const session = await getServerSession(enhancedAuthOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json(
      createErrorResponse(ApiErrorCode.UNAUTHORIZED, "Unauthorized"),
      { status: 401 }
    );
  }

  // Only allow ADMIN users to access debug endpoints
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      createErrorResponse(ApiErrorCode.FORBIDDEN, "Forbidden"),
      { status: 403 }
    );
  }

  try {
    const [basicTest, oauthTest] = await Promise.all([
      testDatabaseConnection(),
      testOAuthDatabaseOperations()
    ]);

    const results = {
      basicConnection: basicTest,
      oauthOperations: oauthTest,
      overallStatus: basicTest.success && oauthTest.success ? 'HEALTHY' : 'UNHEALTHY'
    };
    
    return NextResponse.json(
      createSuccessResponse(results),
      { status: results.overallStatus === 'HEALTHY' ? 200 : 500 }
    );
    
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        ApiErrorCode.INTERNAL_ERROR, 
        error instanceof Error ? error.message : "Diagnostics failed"
      ),
      { status: 500 }
    );
  }
}
