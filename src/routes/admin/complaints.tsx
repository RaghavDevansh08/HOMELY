import { createFileRoute } from "@tanstack/react-router";
import { AdminComplaints } from "@/components/homely/admin";
export const Route = createFileRoute("/admin/complaints")({ component: AdminComplaints });
