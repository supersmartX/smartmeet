import { Metadata } from "next";
import TeamClient from "@/components/dashboard/team/TeamClient";

export const metadata: Metadata = {
  title: "Team Management | SupersmartX AI",
  description: "Manage your organization's members and their access levels.",
  alternates: {
    canonical: "/dashboard/team",
  },
};

export default function TeamPage() {
  return <TeamClient />;
}