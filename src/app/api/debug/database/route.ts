import { testDatabaseConnection, testOAuthDatabaseOperations } from "@/lib/test-db";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";

export async function GET() {
  const session = await getServerSession(enhancedAuthOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Only allow ADMIN users to access debug endpoints
  if (session.user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  try {
    const [basicTest, oauthTest] = await Promise.all([
      testDatabaseConnection(),
      testOAuthDatabaseOperations()
    ]);

    const results = {
      timestamp: new Date().toISOString(),
      basicConnection: basicTest,
      oauthOperations: oauthTest,
      overallStatus: basicTest.success && oauthTest.success ? 'HEALTHY' : 'UNHEALTHY'
    };
    
    return new Response(JSON.stringify(results, null, 2), {
      status: results.overallStatus === 'HEALTHY' ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      overallStatus: 'ERROR'
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
