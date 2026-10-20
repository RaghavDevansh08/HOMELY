import { createFileRoute } from "@tanstack/react-router";
import { AdminSettings } from "@/components/homely/admin";
export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });
