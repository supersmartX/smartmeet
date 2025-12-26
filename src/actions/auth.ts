"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  apiKey?: string;
}

interface SignUpResult {
  success: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export async function signUp(formData: SignUpFormData) {
  const { name, email, password, apiKey } = formData;

  if (!name || !email || !password) {
    throw new Error("Missing required fields");
  }

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
    },
  });

  return { success: true, user: { id: user.id, name: user.name, email: user.email } };
}
