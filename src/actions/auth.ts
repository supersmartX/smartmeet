"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail } from "@/lib/mail";
import { signUpSchema, SignUpInput } from "@/lib/validations/auth";
import { logSecurityEvent } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function signUp(formData: SignUpInput) {
  try {
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

    if (user.email && user.verificationToken) {
      await sendVerificationEmail(user.email, user.verificationToken);
    }

    await logSecurityEvent(
      "SIGNUP_SUCCESS",
      user.id,
      `Account created for ${user.email}`,
      "Authentication"
    );

    return { 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email } 
    };
  } catch (error) {
    console.error("SignUp Error:", error);
    return { 
      success: false, 
      error: "An unexpected error occurred during signup." 
    };
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return { success: true, message: "If an account exists, a reset link has been sent." };
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
      `Password reset requested for ${email}`,
      "Authentication"
    );

    return { success: true, message: "If an account exists, a reset link has been sent." };
  } catch (error) {
    console.error("Password Reset Request Error:", error);
    return { success: false, error: "Failed to process request." };
  }
}

export async function resetPassword(token: string, password: string) {
  try {
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
      `Password successfully reset for ${user.email}`,
      "Authentication"
    );

    return { success: true, message: "Password has been reset successfully." };
  } catch (error) {
    console.error("Password Reset Error:", error);
    return { success: false, error: "Failed to reset password." };
  }
}
