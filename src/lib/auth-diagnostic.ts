// Auth Diagnostic Tool
// Run this to check your auth configuration

export function checkAuthConfig() {
  const config = {
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    google: {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
      clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    },
    github: {
      hasClientId: !!process.env.GITHUB_ID,
      hasClientSecret: !!process.env.GITHUB_SECRET,
      clientIdLength: process.env.GITHUB_ID?.length || 0,
      clientSecretLength: process.env.GITHUB_SECRET?.length || 0,
    },
    nodeEnv: process.env.NODE_ENV,
  };

  const issues = [];

  if (!config.hasNextAuthSecret) {
    issues.push("❌ NEXTAUTH_SECRET is missing");
  }

  if (!config.hasNextAuthUrl) {
    issues.push("❌ NEXTAUTH_URL is missing");
  }

  if (!config.hasDatabaseUrl) {
    issues.push("❌ DATABASE_URL is missing");
  }

  if (config.google.hasClientId && !config.google.hasClientSecret) {
    issues.push("⚠️  Google Client ID provided but missing Client Secret");
  }

  if (config.github.hasClientId && !config.github.hasClientSecret) {
    issues.push("⚠️  GitHub Client ID provided but missing Client Secret");
  }

  return {
    config,
    issues,
    isHealthy: issues.length === 0,
  };
}

export function getAuthDebugInfo() {
  const diagnostic = checkAuthConfig();
  
  console.log("=== Auth Configuration Diagnostic ===");
  console.log("Environment:", diagnostic.config.nodeEnv);
  console.log("NextAuth Secret:", diagnostic.config.hasNextAuthSecret ? "✅ Present" : "❌ Missing");
  console.log("NextAuth URL:", diagnostic.config.hasNextAuthUrl ? "✅ Present" : "❌ Missing");
  console.log("Database URL:", diagnostic.config.hasDatabaseUrl ? "✅ Present" : "❌ Missing");
  
  console.log("\n=== OAuth Providers ===");
  console.log("Google:", diagnostic.config.google.hasClientId ? "✅ Configured" : "❌ Not configured");
  console.log("GitHub:", diagnostic.config.github.hasClientId ? "✅ Configured" : "❌ Not configured");
  
  if (diagnostic.issues.length > 0) {
    console.log("\n=== Issues Found ===");
    diagnostic.issues.forEach(issue => console.log(issue));
  }
  
  console.log("\n=== Health Status ===");
  console.log(diagnostic.isHealthy ? "✅ Configuration appears healthy" : "❌ Configuration has issues");
  
  return diagnostic;
}