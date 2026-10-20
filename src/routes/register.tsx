import { createFileRoute } from "@tanstack/react-router";
import { RegisterPage } from "@/components/homely/account";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    role: typeof search.role === "string" ? search.role : "customer",
  }),
  component: Page,
});

function Page() {
  const { role } = Route.useSearch();
  return <RegisterPage role={role} />;
}
