import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  if (!resend) {
    console.log(`[DEV MODE] Verification link for ${email}: ${verifyLink}`);
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
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
}