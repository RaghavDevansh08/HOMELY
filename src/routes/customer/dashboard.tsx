import { createFileRoute } from "@tanstack/react-router";
import { CustomerDashboard } from "@/components/homely/customer";
export const Route = createFileRoute("/customer/dashboard")({ component: CustomerDashboard });
