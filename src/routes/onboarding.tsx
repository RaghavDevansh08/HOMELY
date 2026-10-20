import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@/components/homely/account";
export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });
