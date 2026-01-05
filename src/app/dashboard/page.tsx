import { Metadata } from "next";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | SupersmartX AI",
  description: "Monitor your meeting intelligence pipeline, view recent sessions, and access quick insights.",
  alternates: {
    canonical: "/dashboard",
  },
};

export default function DashboardPage() {
  return <DashboardClient />;
}