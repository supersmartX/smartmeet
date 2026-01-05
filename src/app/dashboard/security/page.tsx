import { Metadata } from "next";
import SecurityClient from "@/components/dashboard/security/SecurityClient";

export const metadata: Metadata = {
  title: "Security Activity | SupersmartX AI",
  description: "Monitor account access and security-related events in real-time.",
  alternates: {
    canonical: "/dashboard/security",
  },
};

export default function SecurityPage() {
  return <SecurityClient />;
}