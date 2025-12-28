import { getAuthDebugInfo } from "@/lib/auth-diagnostic";
import { prisma } from "@/lib/prisma";

async function runAuthDiagnostics() {
  console.log("🚀 Running SmartMeet Authentication Diagnostics...\n");
  
  // Check environment configuration
  const diagnostic = getAuthDebugInfo();
  
  // Check database connection
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful");
    
    // Check if tables exist
    const userCount = await prisma.user.count().catch(() => 0);
    console.log(`📊 Users in database: ${userCount}`);
    
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    console.log("💡 Make sure your DATABASE_URL is correct and PostgreSQL is running");
  }
  
  // Check NextAuth configuration
  console.log("\n🔍 NextAuth Configuration:");
  console.log("- Session Strategy: database");
  console.log("- Adapter: Prisma");
  console.log("- Providers: Credentials (always enabled)");
  
  if (diagnostic.config.google.hasClientId) {
    console.log("- Google OAuth: ✅ Configured");
  } else {
    console.log("- Google OAuth: ❌ Not configured");
  }
  
  if (diagnostic.config.github.hasClientId) {
    console.log("- GitHub OAuth: ✅ Configured");
  } else {
    console.log("- GitHub OAuth: ❌ Not configured");
  }
  
  console.log("\n🎯 Quick Fixes Needed:");
  
  if (!diagnostic.config.hasNextAuthSecret) {
    console.log("1. Generate a secure NEXTAUTH_SECRET:");
    console.log("   Run: openssl rand -base64 32");
    console.log("   Or use: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  }
  
  if (!diagnostic.config.hasNextAuthUrl) {
    console.log("2. Set NEXTAUTH_URL to your app URL (e.g., http://localhost:3000)");
  }
  
  if (!diagnostic.config.hasDatabaseUrl) {
    console.log("3. Set up PostgreSQL and configure DATABASE_URL");
    console.log("   Example: postgresql://username:password@localhost:5432/smartmeet");
  }
  
  console.log("\n📚 Setup Instructions:");
  console.log("1. Copy .env.example to .env");
  console.log("2. Fill in required environment variables");
  console.log("3. Run: npx prisma generate");
  console.log("4. Run: npx prisma db push");
  console.log("5. Restart your development server");
  
  await prisma.$disconnect();
}

// Run diagnostics
runAuthDiagnostics().catch(console.error);