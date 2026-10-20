import { createFileRoute } from "@tanstack/react-router";
import { ServicesPage } from "@/components/homely/marketing";

export const Route = createFileRoute("/services/")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" ? search.category : "",
    place: typeof search.place === "string" ? search.place : "",
    date: typeof search.date === "string" ? search.date : "",
    budget: typeof search.budget === "string" ? search.budget : "",
    rating: typeof search.rating === "string" ? search.rating : "",
    slot: typeof search.slot === "string" ? search.slot : "",
    urgency: typeof search.urgency === "string" ? search.urgency : "",
  }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  return <ServicesPage search={search} />;
}
