import { createFileRoute } from "@tanstack/react-router";
import { ProviderProfile } from "@/components/homely/provider";
export const Route = createFileRoute("/provider/profile")({ component: ProviderProfile });
