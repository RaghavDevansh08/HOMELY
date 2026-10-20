import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/homely/admin";
export const Route = createFileRoute("/admin/dashboard")({ component: AdminDashboard });
