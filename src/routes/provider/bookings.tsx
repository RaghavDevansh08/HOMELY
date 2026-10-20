import { createFileRoute } from "@tanstack/react-router";
import { ProviderBookings } from "@/components/homely/provider";
export const Route = createFileRoute("/provider/bookings")({ component: ProviderBookings });
