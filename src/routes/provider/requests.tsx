import { createFileRoute } from "@tanstack/react-router";
import { ProviderRequests } from "@/components/homely/provider";
export const Route = createFileRoute("/provider/requests")({ component: ProviderRequests });
