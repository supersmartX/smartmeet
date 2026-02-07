import { UsageDashboard } from "@/components/dashboard/UsageDashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usage & Quotas | SupersmartX",
  description: "Monitor your plan consumption and AI intelligence credits.",
};

export default function UsagePage() {
  return (
    <div className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full">
      <UsageDashboard />
    </div>
  );
}
