import { testDatabaseConnection, testOAuthDatabaseOperations } from "@/lib/test-db";

export async function GET() {
  try {
    console.log('🧪 Starting database diagnostics...');
    
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
    
    console.log('✅ Database diagnostics completed:', results);
    
    return new Response(JSON.stringify(results, null, 2), {
      status: results.overallStatus === 'HEALTHY' ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('🚨 Database diagnostics failed:', error);
    
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