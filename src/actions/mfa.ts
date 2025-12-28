"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { logSecurityEvent } from "@/lib/audit";

export async function generateMFASecret() {
  const session = await getServerSession(authOptions);
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const verified = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
  });

  if (!verified) {
    throw new Error("Invalid verification code. Please try again.");
  }

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      mfaEnabled: true,
      mfaSecret: secret,
    },
  });

  await logSecurityEvent(
    "MFA_ENABLED",
    user.id,
    "Multi-factor authentication enabled",
    "Security"
  );

  return { success: true };
}

export async function disableMFA() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
    },
  });

  await logSecurityEvent(
    "MFA_DISABLED",
    user.id,
    "Multi-factor authentication disabled",
    "Security"
  );

  return { success: true };
}
