"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail } from "@/lib/mail";
import { signUpSchema, SignUpInput } from "@/lib/validations/auth";

export async function signUp(formData: SignUpInput) {
  const result = signUpSchema.safeParse(formData);

  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }

  const { name, email, password, apiKey } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      apiKey: apiKey || null,
      verificationToken: uuidv4(),
      emailVerified: null,
    },
  });

  if (user.email && user.verificationToken) {
    await sendVerificationEmail(user.email, user.verificationToken);
  }

  return { success: true, user: { id: user.id, name: user.name, email: user.email } };
}
