"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function AuthProvider({ 
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  nonce 
}: { 
  children: ReactNode;
  nonce?: string;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
