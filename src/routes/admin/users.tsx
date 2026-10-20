import { createFileRoute } from "@tanstack/react-router";
import { AdminUsers } from "@/components/homely/admin";
export const Route = createFileRoute("/admin/users")({ component: AdminUsers });
