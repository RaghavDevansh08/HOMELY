import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient, AUTH_PROVIDERS, signIn } from "@/lib/auth/client";
import { saveOnboarding } from "@/lib/homely/api";
import { CITIES } from "@/lib/homely/geo";
import { Button, fieldClass, homeFor, toastErr, useAccount } from "@/components/homely/kit";

function passwordOk(password: string) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Include a letter and a number.";
  return "";
}

export function LoginPage({ from }: { from: string }) {
  const navigate = useNavigate();
  const { refresh } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const next = from.startsWith("/") ? from : "/";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await authClient.signIn.email({ email, password, callbackURL: next });
      if (result.error) {
        setError(result.error.message ?? "Could not sign in.");
        return;
      }
      refresh();
      navigate({ to: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <div>
        <p className="text-sm text-leaf">Welcome back</p>
        <h1 className="mt-2 text-4xl text-navy">Sign in to Homely</h1>
        <p className="mt-3 text-sm text-muted">Customers, professionals, and administrators each have their own desk. Create a separate account when you want to demonstrate another role.</p>
      </div>
      <form onSubmit={submit} className="space-y-3 rounded-3xl border border-line bg-paper p-6">
        <label className="block text-sm">Email
          <input type="email" required className={`${fieldClass} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block text-sm">Password
          <input type="password" required className={`${fieldClass} mt-1`} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
        <div className="grid gap-2">
          {AUTH_PROVIDERS.map((p) => (
            <button key={p.providerId} type="button" className="h-11 rounded-full border border-line text-sm" onClick={() => signIn(p.providerId, { callbackURL: next })}>
              Continue with {p.label}
            </button>
          ))}
        </div>
        <button type="button" className="text-sm text-navy underline" onClick={() => setForgot((v) => !v)}>Forgot password?</button>
        {forgot ? (
          <p className="text-sm text-muted">
            Homely cannot email a reset link — no mail provider is connected, and a reset will not be pretended. Sign in and change the password from your profile, or use Google or X if you registered that way. One-time codes are not enabled.
          </p>
        ) : null}
        <p className="text-sm">New here? <Link to="/register" search={{ role: "customer" }} className="text-leaf underline">Create an account</Link></p>
      </form>
    </main>
  );
}

export function RegisterPage({ role }: { role: string }) {
  const navigate = useNavigate();
  const { refresh } = useAccount();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    city: "Bengaluru",
    role: role === "provider" ? "provider" : "customer",
    terms: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const passwordError = passwordOk(form.password);
    if (passwordError) return setError(passwordError);
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (!form.terms) return setError("Accept the terms to continue.");
    if (form.name.trim().length < 2) return setError("Enter your name.");
    setBusy(true);
    setError("");
    try {
      const signed = await authClient.signUp.email({
        email: form.email,
        password: form.password,
        name: form.name,
        callbackURL: "/",
      });
      if (signed.error) {
        setError(signed.error.message ?? "Could not create the account.");
        return;
      }
      const saved = await saveOnboarding({
        data: { role: form.role as "customer" | "provider", fullName: form.name, phone: form.phone, city: form.city },
      });
      if (!saved.profile) {
        setError("Account created, but the profile was not saved.");
        return;
      }
      refresh();
      toast.success("Account ready.");
      navigate({ to: homeFor(saved.profile.role) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-4xl text-navy">Create your account</h1>
      <p className="mt-2 text-sm text-muted">There is no administrator option here. The first signed-in person can claim that seat once, from the admin desk, if it is empty.</p>
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-3xl border border-line bg-paper p-6">
        <div className="grid grid-cols-2 gap-2">
          {(["customer", "provider"] as const).map((item) => (
            <button type="button" key={item} onClick={() => setForm({ ...form, role: item })} className={`h-11 rounded-full border text-sm ${form.role === item ? "border-navy bg-navy text-paper" : "border-line"}`}>
              {item === "customer" ? "I need help" : "I offer help"}
            </button>
          ))}
        </div>
        <input className={fieldClass} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Full name" />
        <input type="email" required className={fieldClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email" />
        <input className={fieldClass} placeholder="Mobile (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-label="Mobile" />
        <select className={fieldClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} aria-label="City">
          {CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
        </select>
        <input type="password" className={fieldClass} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-label="Password" />
        <input type="password" className={fieldClass} placeholder="Confirm password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} aria-label="Confirm password" />
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
          <span>I agree to the <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.</span>
        </label>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating…" : "Create account"}</Button>
        <p className="text-sm">Already registered? <Link to="/login" search={{ from: "/" }} className="underline">Sign in</Link></p>
      </form>
    </main>
  );
}

export function OnboardingPage() {
  const { user, isPending, loading, profile, refresh } = useAccount();
  const navigate = useNavigate();
  const [role, setRole] = useState<"customer" | "provider">("customer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) navigate({ to: homeFor(profile.role) });
  }, [profile, navigate]);

  if (isPending || loading) return <p className="p-8 text-sm text-muted">Loading your session…</p>;
  if (!user) return <LoginPage from="/onboarding" />;
  if (profile) return <p className="p-8 text-sm text-muted">Opening your desk…</p>;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await saveOnboarding({ data: { role, fullName: fullName || user?.displayName || "", phone, city } });
      if (!result.profile) {
        setError("Could not save your profile.");
        return;
      }
      refresh();
      navigate({ to: homeFor(result.profile.role) });
    } catch (err) {
      toastErr(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-4xl text-navy">How will you use Homely?</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(["customer", "provider"] as const).map((item) => (
            <button type="button" key={item} onClick={() => setRole(item)} className={`h-11 rounded-full border text-sm ${role === item ? "bg-navy text-paper" : "border-line bg-paper"}`}>
              {item === "customer" ? "Customer" : "Professional"}
            </button>
          ))}
        </div>
        <input className={fieldClass} placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-label="Name" />
        <input className={fieldClass} placeholder="Mobile (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Mobile" />
        <select className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
          {CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
        </select>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
      </form>
    </main>
  );
}
