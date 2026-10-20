import { createFileRoute } from "@tanstack/react-router";
import { CustomerAddresses } from "@/components/homely/customer";
export const Route = createFileRoute("/customer/addresses")({ component: CustomerAddresses });
