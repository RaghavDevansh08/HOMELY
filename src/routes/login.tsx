import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/components/homely/account";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === "string" ? search.from : "/",
  }),
  component: Page,
});

function Page() {
  const { from } = Route.useSearch();
  return <LoginPage from={from} />;
}
