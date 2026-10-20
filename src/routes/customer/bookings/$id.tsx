import { createFileRoute } from "@tanstack/react-router";
import { CustomerBookingDetail } from "@/components/homely/customer";
export const Route = createFileRoute("/customer/bookings/$id")({
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <CustomerBookingDetail id={id} />;
}
