import { createFileRoute } from "@tanstack/react-router";
import { ProviderEarnings } from "@/components/homely/provider";
export const Route = createFileRoute("/provider/earnings")({ component: ProviderEarnings });
