import { createFileRoute } from "@tanstack/react-router";
import { CustomerBookings } from "@/components/homely/customer";
export const Route = createFileRoute("/customer/bookings/")({ component: CustomerBookings });
