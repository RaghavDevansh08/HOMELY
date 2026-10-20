import { createFileRoute } from "@tanstack/react-router";
import { AdminProviders } from "@/components/homely/admin";
export const Route = createFileRoute("/admin/providers")({ component: AdminProviders });
