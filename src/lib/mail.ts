import { Resend } from 'resend';
import logger from './logger';

let resendInstance: Resend | null = null;

function getResend() {
  if (resendInstance) return resendInstance;
  
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    resendInstance = new Resend(apiKey);
  }
  
  return resendInstance;
}

const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;
  const resend = getResend();

  if (!resend) {
    logger.info({ email, verifyLink }, "[DEV MODE] Verification link generated");
    return;
  }

  try {
    await resend.emails.send({
      from: `Supersmart <${fromEmail}>`,
      to: email,
      subject: "Verify Your Email",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Supersmart!</h2>
          <p>Please click the button below to verify your email address and complete your registration:</p>
          <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email</a>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p>${verifyLink}</p>
        </div>
      `
    });
  } catch (error) {
    logger.error({ error, email }, "Error sending verification email");
    throw new Error("Failed to send verification email");
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  const resend = getResend();

  if (!resend) {
    logger.info({ email, resetLink }, "[DEV MODE] Password reset link generated");
    return;
  }

  try {
    await resend.emails.send({
      from: `Supersmart <${fromEmail}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p>${resetLink}</p>
        </div>
      `
    });
  } catch (error) {
    logger.error({ error, email }, "Error sending password reset email");
    throw new Error("Failed to send password reset email");
  }
}