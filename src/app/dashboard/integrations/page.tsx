import { Metadata } from "next";
import IntegrationsClient from "@/components/dashboard/integrations/IntegrationsClient";

export const metadata: Metadata = {
  title: "Integrations | SupersmartX AI",
  description: "Extend SupersmartX capabilities with your existing tools like Slack, Zoom, and more.",
  alternates: {
    canonical: "/dashboard/integrations",
  },
};

export default function IntegrationsPage() {
  return <IntegrationsClient />;
}