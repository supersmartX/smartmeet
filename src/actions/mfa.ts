"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { enhancedAuthOptions } from "@/lib/enhanced-auth";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { logSecurityEvent } from "@/lib/audit";
import { createNotification } from "./notification";
import crypto from "crypto";
import logger from "@/lib/logger";
import { ActionResult } from "@/types/meeting";

export async function generateMFASecret(): Promise<ActionResult<{ secret: string; qrCodeUrl: string }>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const secret = speakeasy.generateSecret({
      name: `Supersmart (${session.user.email})`,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

    return {
      success: true,
      data: {
        secret: secret.base32,
        qrCodeUrl,
      }
    };
  } catch (error: unknown) {
    logger.error({ error }, "Generate MFA Secret Error");
    return { success: false, error: "Failed to generate MFA secret" };
  }
}

export async function verifyAndEnableMFA(token: string, secret: string): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
    });

    if (!verified) {
      return { success: false, error: "Invalid verification code. Please try again." };
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

    await createNotification(user.id, {
      title: "MFA Enabled",
      message: "Multi-factor authentication has been successfully enabled on your account.",
      type: "SUCCESS",
      link: "/dashboard/security"
    });

    return { success: true, data: { recoveryCodes } };
  } catch (error: unknown) {
    logger.error({ error }, "Verify and Enable MFA Error");
    return { success: false, error: "Failed to enable MFA" };
  }
}

import bcrypt from "bcryptjs";

export async function disableMFA(token: string, password?: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(enhancedAuthOptions);
    if (!session?.user?.email) return { success: false, error: "Unauthorized" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !user.mfaEnabled) return { success: false, error: "MFA not enabled" };

    // If user has a password, we should require it for deactivation (security best practice)
    if (user.password) {
      if (!password) {
        return { success: false, error: "PASSWORD_REQUIRED" };
      }
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return { success: false, error: "Invalid password" };
      }
    }

    // Verify TOTP token or recovery code
    const isTotpValid = speakeasy.totp.verify({
      secret: user.mfaSecret || "",
      encoding: "base32",
      token,
    });

    const isRecoveryCodeValid = user.mfaRecoveryCodes.includes(token);

    if (!isTotpValid && !isRecoveryCodeValid) {
      return { success: false, error: "Invalid verification code or recovery code" };
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: [], // Always clear recovery codes when MFA is disabled
      },
    });

    await logSecurityEvent(
      "MFA_DISABLED",
      user.id,
      isRecoveryCodeValid ? "MFA disabled using recovery code" : "MFA disabled using TOTP",
      "Security"
    );

    await createNotification(user.id, {
      title: "MFA Disabled",
      message: "Multi-factor authentication has been disabled on your account. We recommend keeping it enabled for better security.",
      type: "WARNING",
      link: "/dashboard/security"
    });

    return { success: true };
  } catch (error: unknown) {
    logger.error({ error }, "Disable MFA Error");
    return { success: false, error: "Failed to disable MFA" };
  }
}
