import { Metadata } from "next";
import HelpClient from "@/components/dashboard/help/HelpClient";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Help & Support | SupersmartX AI",
  description: "Find answers to frequently asked questions and contact our support team.",
  alternates: {
    canonical: "/dashboard/help",
  },
};

export default async function HelpPage() {
  const nonce = (await headers()).get("x-nonce") || "";
  return <HelpClient nonce={nonce} />;
}