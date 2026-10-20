import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Toaster } from "sonner";
import { AccountProvider, Assistant, Footer, Header } from "@/components/homely/kit";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HOMELY — Trusted help around the corner" },
      { name: "description", content: "Book trusted local household professionals with clear estimates." },
      { name: "theme-color", content: "#0c3b4c" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,650&family=Inter:wght@400;500;600&display=swap" },
      { rel: "manifest", href: "/__provider/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__provider/icon-180.png" },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <AccountProvider>
            <Header />
            <Outlet />
            <Footer />
            <Assistant />
            <Toaster richColors position="top-center" />
          </AccountProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
