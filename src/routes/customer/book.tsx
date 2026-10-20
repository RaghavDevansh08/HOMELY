import { createFileRoute } from "@tanstack/react-router";
import { BookWizard } from "@/components/homely/customer";
export const Route = createFileRoute("/customer/book")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === "string" ? search.category : "plumbing",
    provider: typeof search.provider === "string" ? search.provider : "",
  }),
  component: Page,
});
function Page() {
  const { category, provider } = Route.useSearch();
  return <BookWizard category={category} provider={provider} />;
}
