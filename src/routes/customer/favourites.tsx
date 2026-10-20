import { createFileRoute } from "@tanstack/react-router";
import { CustomerFavourites } from "@/components/homely/customer";
export const Route = createFileRoute("/customer/favourites")({ component: CustomerFavourites });
