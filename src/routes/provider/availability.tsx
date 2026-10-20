import { createFileRoute } from "@tanstack/react-router";
import { ProviderAvailability } from "@/components/homely/provider";
export const Route = createFileRoute("/provider/availability")({ component: ProviderAvailability });
