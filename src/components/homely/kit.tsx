import { createContext, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  AirVent,
  Bug,
  Hammer,
  Home,
  Menu,
  MessageCircle,
  Paintbrush,
  Refrigerator,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { askAssistant, getSessionProfile } from "@/lib/homely/api";
import { guideReply } from "@/lib/homely/assistant";
import { inr } from "@/lib/homely/pricing";

export function cn(...parts: Array<string | false | null | undefined>) {
  return twMerge(clsx(parts));
}

export function errText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export function toastErr(error: unknown) {
  const text = errText(error);
  toast.error(text === "Unauthorized" ? "Please sign in to continue." : text);
}

export const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-navy";

type Session = Awaited<ReturnType<typeof getSessionProfile>>;

type AccountValue = {
  user: ReturnType<typeof useCurrentUserState>["user"];
  isPending: boolean;
  loading: boolean;
  profile: Session["profile"];
  provider: Session["provider"];
  unread: number;
  adminSeatOpen: boolean;
  refresh: () => void;
};

const AccountContext = createContext<AccountValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Session | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    getSessionProfile()
      .then((session) => {
        if (live) setData(session);
      })
      .catch(() => {
        if (live) setData(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [isPending, user?.id, tick]);

  const value: AccountValue = {
    user,
    isPending,
    loading: isPending || (!!user && loading),
    profile: data?.profile ?? null,
    provider: data?.provider ?? null,
    unread: data?.unread ?? 0,
    adminSeatOpen: data?.adminSeatOpen ?? false,
    refresh: () => setTick((n) => n + 1),
  };
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("Account context missing");
  return ctx;
}

export function homeFor(role: string | undefined) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "provider") return "/provider/dashboard";
  return "/customer/dashboard";
}

export function Guard({ role, children }: { role: "customer" | "provider" | "admin"; children: ReactNode }) {
  const { user, isPending, loading, profile } = useAccount();
  if (isPending || loading) return <PageSkeleton />;
  if (!user) return <RedirectToSignIn />;
  if (!profile) return <NeedProfile />;
  if (profile.role !== role) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-3xl border border-line bg-paper p-8">
          <h1 className="text-3xl text-navy">This desk is for {role}s</h1>
          <p className="mt-3 text-sm text-muted">
            You are signed in as {profile.fullName}, a {profile.role}. Homely keeps the three desks separate — use another
            account if you are demonstrating a different role.
          </p>
          <Link to={homeFor(profile.role)} className="mt-6 inline-flex h-11 items-center rounded-full bg-navy px-5 text-sm text-paper">
            Go to your desk
          </Link>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}

function NeedProfile() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-3xl text-navy">Finish your profile</h1>
      <p className="mt-3 text-sm text-muted">Tell Homely whether you are booking help or offering it.</p>
      <Link to="/onboarding" className="mt-6 inline-flex h-11 items-center rounded-full bg-leaf px-5 text-sm text-paper">
        Continue
      </Link>
    </main>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div className="h-8 w-48 animate-pulse rounded-full bg-sand" />
      <div className="h-36 animate-pulse rounded-3xl bg-sand" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-3xl bg-sand" />
        <div className="h-28 animate-pulse rounded-3xl bg-sand" />
        <div className="h-28 animate-pulse rounded-3xl bg-sand" />
      </div>
    </div>
  );
}

export function Button({
  variant = "leaf",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "leaf" | "navy" | "ghost" | "danger" }) {
  const styles = {
    leaf: "bg-leaf text-paper hover:bg-navy",
    navy: "bg-navy text-paper hover:bg-navy-deep",
    ghost: "border border-line bg-paper text-ink hover:bg-sand",
    danger: "border border-danger bg-paper text-danger",
  }[variant];
  return (
    <button
      className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition disabled:opacity-50", styles, className)}
      {...props}
    />
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy text-paper">
        <Home className="h-5 w-5" />
      </span>
      <span className="font-display text-xl text-navy">Homely</span>
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/become-provider", label: "Become a professional" },
  { to: "/help", label: "Help" },
] as const;

export function Header() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending, profile, unread } = useAccount();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Logo />
        <nav className="ml-6 hidden items-center gap-5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn("text-sm text-muted hover:text-navy", path === item.to && "text-navy")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {isPending ? <div className="h-9 w-24 animate-pulse rounded-full bg-sand" /> : null}
          {!isPending && !user ? (
            <>
              <Link to="/login" search={{ from: "/" }} className="hidden h-10 items-center rounded-full px-3 text-sm text-navy sm:inline-flex">
                Login
              </Link>
              <Link to="/register" search={{ role: "customer" }} className="inline-flex h-10 items-center rounded-full bg-navy px-4 text-sm text-paper">
                Sign up
              </Link>
            </>
          ) : null}
          {!isPending && user ? (
            <>
              <Link
                to={profile ? homeFor(profile.role) : "/onboarding"}
                className="relative hidden h-10 items-center rounded-full bg-leaf-soft px-4 text-sm text-leaf sm:inline-flex"
              >
                {profile ? "My desk" : "Set up"}
                {unread > 0 ? <span className="ml-2 rounded-full bg-leaf px-1.5 text-xs text-paper">{unread}</span> : null}
              </Link>
              <UserButton />
            </>
          ) : null}
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-line lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line bg-paper px-4 py-3 lg:hidden">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="block py-3 text-base text-ink">
              {item.label}
            </Link>
          ))}
          {!user ? (
            <Link to="/login" search={{ from: "/" }} className="block py-3 text-base text-navy">
              Login
            </Link>
          ) : (
            <Link to={profile ? homeFor(profile.role) : "/onboarding"} className="block py-3 text-base text-leaf">
              My desk
            </Link>
          )}
        </div>
      ) : null}
    </header>
  );
}

export function Footer() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/customer") || path.startsWith("/provider") || path.startsWith("/admin") || path.startsWith("/onboarding")) {
    return null;
  }
  return (
    <footer className="border-t border-line bg-navy-deep text-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl">Homely</p>
          <p className="mt-2 text-sm text-sand">Trusted help. Right around the corner.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-sand">Company</p>
          <Link to="/how-it-works" className="block">How it works</Link>
          <Link to="/become-provider" className="block">Become a professional</Link>
          <Link to="/help" className="block">Help</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-sand">Policies</p>
          <Link to="/privacy" className="block">Privacy</Link>
          <Link to="/terms" className="block">Terms</Link>
        </div>
        <p className="text-sm text-sand">
          Indicative prices in INR. Demo professionals and sample reviews are labelled. Maps, SMS, and card payments are not connected.
        </p>
      </div>
    </footer>
  );
}

const ICONS = {
  plumbing: Wrench,
  electrical: Zap,
  cleaning: Sparkles,
  appliance: Refrigerator,
  carpentry: Hammer,
  painting: Paintbrush,
  pest: Bug,
  ac: AirVent,
  maintenance: Home,
} as const;

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[slug as keyof typeof ICONS] ?? Home;
  return <Icon className={className} />;
}

export function Verified({ status }: { status: string }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-leaf-soft px-2 py-0.5 text-xs font-medium text-leaf">
        <ShieldCheck className="h-3.5 w-3.5" /> Verified
      </span>
    );
  }
  if (status === "pending") return <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-warn">Verification pending</span>;
  return <span className="rounded-full bg-sand px-2 py-0.5 text-xs text-muted">Not verified</span>;
}

export function DemoPill() {
  return <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-medium text-warn">Demo</span>;
}

export function Money({ value }: { value: number }) {
  return <span className="tabular-nums">{inr(value)}</span>;
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink">
      <Star className="h-3.5 w-3.5 fill-warn text-warn" />
      <span className="tabular-nums">{value ? value.toFixed(1) : "New"}</span>
    </span>
  );
}

export function AppFrame({
  title,
  links,
  children,
}: {
  title: string;
  links: { to: string; label: string }[];
  children: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr]">
      <aside className="hidden md:block">
        <p className="px-3 text-xs uppercase tracking-wide text-muted">Desk</p>
        <nav className="mt-2 space-y-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm text-muted hover:bg-paper hover:text-navy",
                path === link.to && "bg-paper text-navy",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 pb-24 md:pb-8">
        <h1 className="text-3xl text-navy">{title}</h1>
        <div className="mt-5">{children}</div>
      </section>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-paper md:hidden">
        {links.slice(0, 4).map((link) => (
          <Link key={link.to} to={link.to} className={cn("px-2 py-3 text-center text-xs text-muted", path === link.to && "text-navy")}>
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export const CUSTOMER_LINKS = [
  { to: "/customer/dashboard", label: "Home" },
  { to: "/customer/bookings", label: "Bookings" },
  { to: "/customer/addresses", label: "Addresses" },
  { to: "/customer/favourites", label: "Saved" },
  { to: "/customer/profile", label: "Profile" },
];

export const PROVIDER_LINKS = [
  { to: "/provider/dashboard", label: "Home" },
  { to: "/provider/requests", label: "Requests" },
  { to: "/provider/bookings", label: "Jobs" },
  { to: "/provider/earnings", label: "Earnings" },
  { to: "/provider/availability", label: "Hours" },
  { to: "/provider/profile", label: "Profile" },
];

export const ADMIN_LINKS = [
  { to: "/admin/dashboard", label: "Overview" },
  { to: "/admin/users", label: "People" },
  { to: "/admin/providers", label: "Pros" },
  { to: "/admin/verifications", label: "Docs" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/complaints", label: "Issues" },
  { to: "/admin/settings", label: "Settings" },
];

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-paper px-6 py-10 text-center">
      <h2 className="text-2xl text-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "guide" | "provider"; text: string; slug?: string | null }[]>([
    {
      role: "guide",
      text: "I can help you pick a service, understand estimates, and explain cancellation. I will not invent a booking status.",
    },
  ]);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const app = path.startsWith("/customer") || path.startsWith("/provider") || path.startsWith("/admin");

  function send(event: React.FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message) return;
    const reply = guideReply(message);
    setMessages((m) => [...m, { role: "user", text: message }, { role: "guide", text: reply.text, slug: reply.categorySlug }]);
    setText("");
  }

  async function refine(message: string) {
    setBusy(true);
    try {
      const result = await askAssistant({ data: { message } });
      if (!result.ok) toastErr(new Error(result.error));
      else setMessages((m) => [...m, { role: "provider", text: result.available ? result.text : result.text }]);
    } catch (error) {
      toastErr(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("fixed right-4 z-40", app ? "bottom-20 md:bottom-6" : "bottom-4")}>
      {open ? (
        <div className="mb-3 flex h-96 w-[min(100vw-2rem,22rem)] flex-col rounded-3xl border border-line bg-paper shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium text-navy">Homely guide</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close guide">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.map((message, index) => (
              <div key={index} className={cn("rounded-2xl px-3 py-2", message.role === "user" ? "ml-6 bg-navy text-paper" : "mr-4 bg-foam text-ink")}>
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.slug ? (
                  <Link to="/services/$slug" params={{ slug: message.slug }} className="mt-2 inline-block text-leaf underline">
                    View this service
                  </Link>
                ) : null}
                {message.role === "guide" && index === messages.length - 1 ? (
                  <button type="button" className="mt-2 block text-xs text-navy underline" disabled={busy} onClick={() => refine(messages.filter((m) => m.role === "user").at(-1)?.text ?? message.text)}>
                    {busy ? "Asking Assistant…" : "Ask Assistant for a fuller answer"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
            <input className={fieldClass} value={text} onChange={(e) => setText(e.target.value)} placeholder="Leaking tap, or how cancellation works" aria-label="Message the guide" />
            <Button type="submit" className="shrink-0 px-4">Send</Button>
          </form>
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen((v) => !v)} className="ml-auto flex h-12 items-center gap-2 rounded-full bg-navy px-4 text-sm text-paper">
        <MessageCircle className="h-4 w-4" /> Guide
      </button>
    </div>
  );
}
