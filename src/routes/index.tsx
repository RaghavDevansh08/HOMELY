import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/homely/marketing";

export const Route = createFileRoute("/")({ component: HomePage });
