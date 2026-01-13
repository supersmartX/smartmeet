import { prisma } from "@/lib/prisma";
import logger from "./logger";

export async function testDatabaseConnection() {
  try {
    logger.info('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    logger.info('Database connection successful');
    
    // Test user table
    const userCount = await prisma.user.count();
    logger.info({ userCount }, 'User table accessible');
    
    // Test account table (for OAuth)
    const accountCount = await prisma.account.count();
    logger.info({ accountCount }, 'Account table accessible');
    
    // Test session table
    const sessionCount = await prisma.session.count();
    logger.info({ sessionCount }, 'Session table accessible');
    
    return {
      success: true,
      userCount,
      accountCount,
      sessionCount
    };
  } catch (error) {
    logger.error({ error }, 'Database connection failed');
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
    logger.info('Testing OAuth database operations...');
    
    // Test finding user by email (common OAuth operation)
    const testEmail = 'test@example.com';
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (user) {
      logger.info({ userId: user.id }, 'Found existing user');
    } else {
      logger.info('Test user not found (this is normal)');
    }
    
    // Test account linking operations
    const accounts = await prisma.account.findMany({
      take: 5,
      include: { user: true }
    });
    
    logger.info({ accountCount: accounts.length }, 'Found OAuth accounts');
    
    return {
      success: true,
      userFound: !!user,
      accountCount: accounts.length
    };
  } catch (error) {
    logger.error({ error }, 'OAuth database operations failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OAuth database error'
    };
  }
}