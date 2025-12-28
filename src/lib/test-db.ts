import { prisma } from "@/lib/prisma";

export async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test user table
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible - ${userCount} users found`);
    
    // Test account table (for OAuth)
    const accountCount = await prisma.account.count();
    console.log(`✅ Account table accessible - ${accountCount} accounts found`);
    
    // Test session table
    const sessionCount = await prisma.session.count();
    console.log(`✅ Session table accessible - ${sessionCount} sessions found`);
    
    return {
      success: true,
      userCount,
      accountCount,
      sessionCount
    };
  } catch (error) {
    console.error('🚨 Database connection failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Test OAuth-specific database operations
export async function testOAuthDatabaseOperations() {
  try {
    console.log('🔍 Testing OAuth database operations...');
    
    // Test finding user by email (common OAuth operation)
    const testEmail = 'test@example.com';
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (user) {
      console.log('✅ Found existing user:', user.id);
    } else {
      console.log('ℹ️ Test user not found (this is normal)');
    }
    
    // Test account linking operations
    const accounts = await prisma.account.findMany({
      take: 5,
      include: { user: true }
    });
    
    console.log(`✅ Found ${accounts.length} OAuth accounts`);
    
    return {
      success: true,
      userFound: !!user,
      accountCount: accounts.length
    };
  } catch (error) {
    console.error('🚨 OAuth database operations failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OAuth database error'
    };
  }
}