"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail } from "@/lib/mail";
import { signUpSchema, SignUpInput } from "@/lib/validations/auth";
import { logSecurityEvent } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/mail";
import { maskEmail } from "@/lib/utils";
import logger from "@/lib/logger";
import { ActionResult } from "@/types/meeting";
import { checkLoginRateLimitWithIP } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function signUp(formData: SignUpInput): Promise<ActionResult<{ id: string; name: string | null; email: string | null }>> {
  try {
    const headerList = await headers();
    const ipAddress = headerList.get("x-forwarded-for")?.split(',')[0] ||
                     headerList.get("x-real-ip") || undefined;

    const rateLimitResult = await checkLoginRateLimitWithIP(formData.email || "signup", ipAddress);
    if (!rateLimitResult.allowed) {
      return { success: false, error: "Too many attempts. Please try again later." };
    }

    const result = signUpSchema.safeParse(formData);

    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const { name, email, password } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "User already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken: uuidv4(),
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        emailVerified: null,
      },
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to SupersmartX! 🚀",
        message: "We're excited to have you here. Start by uploading your first meeting recording to see the magic happen.",
        type: "SUCCESS",
        link: "/dashboard",
      }
    });

    if (user.email && user.verificationToken) {
      await sendVerificationEmail(user.email, user.verificationToken);
    }

    await logSecurityEvent(
      "SIGNUP_SUCCESS",
      user.id,
      `Account created for ${maskEmail(user.email)}`,
      "Authentication"
    );

    return { 
      success: true, 
      data: { id: user.id, name: user.name, email: user.email } 
    };
  } catch (error) {
    logger.error({ error }, "SignUp Error");
    return { 
      success: false, 
      error: "An unexpected error occurred during signup." 
    };
  }
}

export async function requestPasswordReset(email: string): Promise<ActionResult<{ message: string }>> {
  try {
    const headerList = await headers();
    const ipAddress = headerList.get("x-forwarded-for")?.split(',')[0] ||
                     headerList.get("x-real-ip") || undefined;

    const rateLimitResult = await checkLoginRateLimitWithIP(email, ipAddress);
    if (!rateLimitResult.allowed) {
      return { success: false, error: "Too many attempts. Please try again later." };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return { success: true, data: { message: "If an account exists, a reset link has been sent." } };
    }

    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    await sendPasswordResetEmail(email, resetToken);

    await logSecurityEvent(
      "PASSWORD_RESET_REQUESTED",
      user.id,
      `Password reset requested for ${maskEmail(email)}`,
      "Authentication"
    );

    return { success: true, data: { message: "If an account exists, a reset link has been sent." } };
  } catch (error) {
    logger.error({ error, email }, "Password Reset Request Error");
    return { success: false, error: "Failed to process request." };
  }
}

export async function resetPassword(token: string, password: string): Promise<ActionResult<{ message: string }>> {
  try {
    const headerList = await headers();
    const ipAddress = headerList.get("x-forwarded-for")?.split(',')[0] ||
                     headerList.get("x-real-ip") || undefined;

    // Use token as key for rate limiting reset password
    const rateLimitResult = await checkLoginRateLimitWithIP(token, ipAddress);
    if (!rateLimitResult.allowed) {
      return { success: false, error: "Too many attempts. Please try again later." };
    }

    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return { success: false, error: "Invalid or expired reset token." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    await logSecurityEvent(
      "PASSWORD_RESET_SUCCESS",
      user.id,
      `Password successfully reset for ${maskEmail(user.email)}`,
      "Authentication"
    );

    return { success: true, data: { message: "Password has been reset successfully." } };
  } catch (error) {
    logger.error({ error }, "Password Reset Error");
    return { success: false, error: "Failed to reset password." };
  }
}
