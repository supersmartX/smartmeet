import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
  }

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
    },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));
  }

  // Check if token has expired
  if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
    return NextResponse.redirect(new URL("/login?error=token_expired", req.url));
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpires: null,
    },
  });

  // Add notification for email verification
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: "Email Verified! ✅",
      message: "Your email has been successfully verified. You now have full access to all features.",
      type: "SUCCESS",
    }
  });

  return NextResponse.redirect(new URL("/login?message=email_verified", req.url));
}