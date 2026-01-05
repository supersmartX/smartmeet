"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { logSecurityEvent } from "@/lib/audit";
import crypto from "crypto";

export async function generateMFASecret() {
  const session = await getServerSession(enhancedAuthOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const secret = speakeasy.generateSecret({
    name: `Supersmart (${session.user.email})`,
  });

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

  return {
    secret: secret.base32,
    qrCodeUrl,
  };
}

export async function verifyAndEnableMFA(token: string, secret: string) {
  const session = await getServerSession(enhancedAuthOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const verified = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
  });

  if (!verified) {
    throw new Error("Invalid verification code. Please try again.");
  }

  // Generate 10 recovery codes
  const recoveryCodes = Array.from({ length: 10 }).map(() => 
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      mfaEnabled: true,
      mfaSecret: secret,
      mfaRecoveryCodes: recoveryCodes as string[],
    },
  });

  await logSecurityEvent(
    "MFA_ENABLED",
    user.id,
    "Multi-factor authentication enabled",
    "Security"
  );

  return { success: true, recoveryCodes };
}

export async function disableMFA(token: string) {
  const session = await getServerSession(enhancedAuthOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user || !user.mfaEnabled) throw new Error("MFA not enabled");

  // Verify TOTP token or recovery code
  const isTotpValid = speakeasy.totp.verify({
    secret: user.mfaSecret || "",
    encoding: "base32",
    token,
  });

  const isRecoveryCodeValid = user.mfaRecoveryCodes.includes(token);

  if (!isTotpValid && !isRecoveryCodeValid) {
    throw new Error("Invalid verification code or recovery code");
  }

  // If recovery code was used, remove it from the list
  const updatedRecoveryCodes = isRecoveryCodeValid 
    ? user.mfaRecoveryCodes.filter(code => code !== token)
    : user.mfaRecoveryCodes;

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaRecoveryCodes: isRecoveryCodeValid ? updatedRecoveryCodes : [], // Clear codes if disabling
    },
  });

  await logSecurityEvent(
    "MFA_DISABLED",
    user.id,
    isRecoveryCodeValid ? "MFA disabled using recovery code" : "MFA disabled using TOTP",
    "Security"
  );

  return { success: true };
}
