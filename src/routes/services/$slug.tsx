import { createFileRoute } from "@tanstack/react-router";
import { ServiceDetail } from "@/components/homely/marketing";

export const Route = createFileRoute("/services/$slug")({
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  return <ServiceDetail slug={slug} />;
}
