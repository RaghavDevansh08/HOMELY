import { createFileRoute } from "@tanstack/react-router";
import { CustomerProfile } from "@/components/homely/customer";
export const Route = createFileRoute("/customer/profile")({ component: CustomerProfile });
