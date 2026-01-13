import logger from "./logger";

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
  
  logger.info({ 
    env: diagnostic.config.nodeEnv,
    hasNextAuthSecret: diagnostic.config.hasNextAuthSecret,
    hasNextAuthUrl: diagnostic.config.hasNextAuthUrl,
    hasDatabaseUrl: diagnostic.config.hasDatabaseUrl
  }, "Auth Configuration Diagnostic");
  
  logger.info({
    google: diagnostic.config.google.hasClientId,
    github: diagnostic.config.github.hasClientId
  }, "OAuth Providers Configuration");
  
  if (diagnostic.issues.length > 0) {
    logger.warn({ issues: diagnostic.issues }, "Auth Configuration Issues Found");
  }
  
  logger.info({ isHealthy: diagnostic.isHealthy }, "Auth Health Status");
  
  return diagnostic;
}