import { createFileRoute } from "@tanstack/react-router";
import { ProviderDashboard } from "@/components/homely/provider";
export const Route = createFileRoute("/provider/dashboard")({ component: ProviderDashboard });
