import { createFileRoute } from "@tanstack/react-router";
import { AdminBookings } from "@/components/homely/admin";
export const Route = createFileRoute("/admin/bookings")({ component: AdminBookings });
