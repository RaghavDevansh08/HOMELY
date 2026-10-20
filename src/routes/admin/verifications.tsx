import { createFileRoute } from "@tanstack/react-router";
import { AdminVerifications } from "@/components/homely/admin";
export const Route = createFileRoute("/admin/verifications")({ component: AdminVerifications });
