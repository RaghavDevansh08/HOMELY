import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  adminGetSettings,
  adminHideReview,
  adminListBookings,
  adminListComplaints,
  adminListProviders,
  adminListReviews,
  adminListUsers,
  adminListVerifications,
  adminOverview,
  adminReviewVerification,
  adminSaveSettings,
  adminSetProvider,
  adminUpdateCategory,
  adminUpdateComplaint,
  claimAdmin,
} from "@/lib/homely/api";
import { inr } from "@/lib/homely/pricing";
import {
  ADMIN_LINKS,
  AppFrame,
  Button,
  DemoPill,
  Empty,
  PageSkeleton,
  fieldClass,
  toastErr,
  useAccount,
} from "@/components/homely/kit";
import { RedirectToSignIn } from "@/lib/auth/gates";

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  const { user, isPending, loading, profile, adminSeatOpen, refresh } = useAccount();
  if (isPending || loading) return <PageSkeleton />;
  if (!user) return <RedirectToSignIn />;
  if (!profile) return <p className="p-8">Create a profile first, then return here.</p>;
  if (profile.role !== "admin") {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-3xl text-navy">Administrator</h1>
        {adminSeatOpen ? (
          <>
            <p className="mt-3 text-sm text-muted">No administrator exists yet. Claiming this seat replaces your current role. Use a dedicated account if you still need the customer or professional desk.</p>
            <Button className="mt-4" type="button" onClick={() => claimAdmin().then((r) => { if (!r.ok) toast.error(r.error); else { toast.success("You are the administrator"); refresh(); } }).catch(toastErr)}>
              Claim administrator
            </Button>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">This desk is already assigned. Signing in as a customer cannot grant it.</p>
        )}
      </main>
    );
  }
  return <AppFrame title={title} links={ADMIN_LINKS}>{children}</AppFrame>;
}

export function AdminDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminOverview>> | null>(null);
  useEffect(() => { adminOverview().then(setData).catch(toastErr); }, []);
  if (data && !data.ok) return <Frame title="Overview"><p>{data.error}</p></Frame>;
  return (
    <Frame title="Overview">
      {!data ? <div className="h-40 animate-pulse rounded-3xl bg-sand" /> : null}
      {data && data.ok ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Customers" value={String(data.people.customer ?? 0)} />
            <Tile label="Professionals" value={String(data.people.provider ?? 0)} />
            <Tile label="Pending documents" value={String(data.pendingVerifications)} />
            <Tile label="Open complaints" value={String(data.openComplaints)} />
          </div>
          <p className="mt-3 text-xs text-muted">Platform fees on completed visits: {inr(data.platformFees)}. Includes {data.demoBookings} labelled demo bookings.</p>
          <div className="mt-4 h-64 rounded-3xl border border-line bg-paper p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bookings.map((b) => ({ name: b.status.replaceAll("_", " "), count: b.count }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-navy)" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : null}
    </Frame>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return <article className="rounded-3xl border border-line bg-paper p-4"><p className="text-sm text-muted">{label}</p><p className="text-3xl text-navy">{value}</p></article>;
}

export function AdminUsers() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListUsers>> | null>(null);
  useEffect(() => { adminListUsers().then(setData).catch(toastErr); }, []);
  return (
    <Frame title="People">
      {data && data.ok ? (
        <div className="overflow-x-auto rounded-3xl border border-line bg-paper">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-muted"><th className="p-3">Name</th><th>Role</th><th>City</th><th>Email</th></tr></thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.userId} className="border-t border-line">
                  <td className="p-3">{u.name} {u.demo ? <DemoPill /> : null}</td>
                  <td>{u.role}</td>
                  <td>{u.city}</td>
                  <td>{u.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <PageSkeleton />}
    </Frame>
  );
}

export function AdminProviders() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListProviders>> | null>(null);
  function load() { adminListProviders().then(setData).catch(toastErr); }
  useEffect(load, []);
  async function act(userId: string, action: "suspend" | "reactivate" | "reject") {
    const result = await adminSetProvider({ data: { userId, action } });
    if (!result.ok) toast.error(result.error);
    else { toast.success("Updated"); load(); }
  }
  return (
    <Frame title="Professionals">
      <div className="space-y-3">
        {data && data.ok ? data.providers.map((p) => (
          <article key={p.userId} className="rounded-3xl border border-line bg-paper p-4 text-sm">
            <p className="text-lg text-navy">{p.name} {p.isDemo ? <DemoPill /> : null}</p>
            <p className="text-muted">{p.city} · {p.status} · trust {p.trustScore} · jobs {p.jobs}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="danger" onClick={() => act(p.userId, "suspend").catch(toastErr)}>Suspend</Button>
              <Button type="button" variant="ghost" onClick={() => act(p.userId, "reactivate").catch(toastErr)}>Reactivate</Button>
              <Button type="button" variant="ghost" onClick={() => act(p.userId, "reject").catch(toastErr)}>Reject</Button>
            </div>
          </article>
        )) : <PageSkeleton />}
      </div>
    </Frame>
  );
}

export function AdminBookings() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListBookings>> | null>(null);
  useEffect(() => { adminListBookings().then(setData).catch(toastErr); }, []);
  return (
    <Frame title="Bookings">
      {data && data.ok && data.bookings.length === 0 ? <Empty title="No bookings" body="New visits will appear here." /> : null}
      <div className="space-y-2">
        {data && data.ok ? data.bookings.map((b) => (
          <article key={b.id} className="rounded-2xl border border-line bg-paper p-4 text-sm">
            <p className="font-medium">{b.publicId} · {b.categoryName}</p>
            <p className="text-muted">{b.status} · {b.customerName} → {b.providerName} · {inr(b.agreedTotalInr)} {(b.isDemoProvider || b.isDemoCustomer) ? "· demo" : ""}</p>
          </article>
        )) : null}
      </div>
    </Frame>
  );
}

export function AdminVerifications() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListVerifications>> | null>(null);
  const [note, setNote] = useState("");
  function load() { adminListVerifications().then(setData).catch(toastErr); }
  useEffect(load, []);
  return (
    <Frame title="Documents">
      <p className="mb-3 text-xs text-muted">Only administrators see uploaded files. Approving sets the verified badge. Rejecting removes it.</p>
      <div className="space-y-3">
        {data && data.ok ? data.records.map((r) => (
          <article key={r.id} className="rounded-3xl border border-line bg-paper p-4 text-sm">
            <p className="text-lg text-navy">{r.name}</p>
            <p>{r.docType} · {r.referenceLabel || "no reference"} · {r.status} · consent {r.consent ? "yes" : "no"}</p>
            {r.fileData ? <img src={r.fileData} alt="Submitted document" className="mt-2 max-h-48 rounded-xl" /> : <p className="text-muted">{r.fileName || "No file bytes stored."}</p>}
            {r.status === "pending" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <input className={fieldClass} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Review note" />
                <Button type="button" onClick={() => adminReviewVerification({ data: { id: r.id, decision: "approved", note } }).then((res) => { if (!res.ok) toast.error(res.error); else { toast.success("Approved"); load(); } }).catch(toastErr)}>Approve</Button>
                <Button type="button" variant="danger" onClick={() => adminReviewVerification({ data: { id: r.id, decision: "rejected", note } }).then((res) => { if (!res.ok) toast.error(res.error); else load(); }).catch(toastErr)}>Reject</Button>
              </div>
            ) : null}
          </article>
        )) : <PageSkeleton />}
      </div>
    </Frame>
  );
}

export function AdminComplaints() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListComplaints>> | null>(null);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof adminListReviews>> | null>(null);
  function load() {
    adminListComplaints().then(setData).catch(toastErr);
    adminListReviews().then(setReviews).catch(toastErr);
  }
  useEffect(load, []);
  return (
    <Frame title="Complaints and reviews">
      <div className="space-y-3">
        {data && data.ok && data.complaints.length === 0 ? <Empty title="No complaints" body="Reports from customers and professionals land here." /> : null}
        {data && data.ok ? data.complaints.map((c) => (
          <article key={c.id} className="rounded-3xl border border-line bg-paper p-4 text-sm">
            <p className="font-medium">{c.subject} {c.demo ? <DemoPill /> : null}</p>
            <p className="text-muted">{c.body}</p>
            <p className="mt-1">Status: {c.status}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["reviewing", "upheld", "dismissed"] as const).map((status) => (
                <Button key={status} type="button" variant="ghost" onClick={() => adminUpdateComplaint({ data: { id: c.id, status, note: status === "upheld" ? "Upheld after review" : "Reviewed" } }).then((r) => { if (!r.ok) toast.error(r.error); else { toast.success("Updated"); load(); } }).catch(toastErr)}>{status}</Button>
              ))}
            </div>
          </article>
        )) : null}
      </div>
      <h2 className="mt-8 text-2xl text-navy">Reviews</h2>
      <div className="mt-3 space-y-2">
        {reviews && reviews.ok ? reviews.reviews.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-paper p-4 text-sm">
            {r.isDemo ? <DemoPill /> : null} <span>{r.providerName} · {r.rating}/5 {r.hidden ? "· hidden" : ""}</span>
            <p>{r.body}</p>
            <button type="button" className="text-navy underline" onClick={() => adminHideReview({ data: { id: r.id, hidden: !r.hidden } }).then(load).catch(toastErr)}>{r.hidden ? "Restore" : "Hide"}</button>
          </article>
        )) : null}
      </div>
    </Frame>
  );
}

export function AdminSettings() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminGetSettings>> | null>(null);
  const [form, setForm] = useState<Record<string, number> | null>(null);
  function load() {
    adminGetSettings().then((d) => { setData(d); if (d.ok) setForm(d.settings); }).catch(toastErr);
  }
  useEffect(load, []);
  if (!data || !data.ok || !form) return <Frame title="Settings">{data && !data.ok ? <p>{data.error}</p> : <PageSkeleton />}</Frame>;
  const settings = data.settings;
  return (
    <Frame title="Settings">
      <form className="grid gap-2 md:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        adminSaveSettings({ data: form }).then((r) => { if (!r.ok) toast.error(r.error); else { toast.success("Saved"); load(); } }).catch(toastErr);
      }}>
        {([
          ["platformFeePct", "Platform fee %"],
          ["gstPct", "GST %"],
          ["urgencySameDayPct", "Same-day %"],
          ["urgencyEmergencyPct", "Emergency %"],
          ["cancelFreeHours", "Free cancel hours"],
          ["cancelFeePct", "Cancel fee %"],
          ["materialBufferPct", "Material buffer %"],
        ] as const).map(([key, label]) => (
          <label key={key} className="text-sm">{label}
            <input className={`${fieldClass} mt-1`} value={form[key] ?? settings[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
          </label>
        ))}
        <Button type="submit" className="md:col-span-2">Save policy</Button>
      </form>
      <h2 className="mt-8 text-2xl text-navy">Categories</h2>
      <div className="mt-3 space-y-2">
        {data.categories.map((c) => (
          <form key={c.slug} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper p-3 text-sm" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            adminUpdateCategory({ data: { slug: c.slug, startingPriceInr: Number(fd.get("price")), active: fd.get("active") === "on" } }).then(load).catch(toastErr);
          }}>
            <span className="w-40">{c.name}</span>
            <input name="price" defaultValue={c.startingPriceInr} className="h-10 w-28 rounded-xl border border-line px-2" aria-label={`${c.name} price`} />
            <label className="flex items-center gap-1"><input type="checkbox" name="active" defaultChecked={c.active} /> Active</label>
            <Button type="submit" variant="ghost">Update</Button>
          </form>
        ))}
      </div>
      <h2 className="mt-8 text-2xl text-navy">Audit log</h2>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {data.audit.length === 0 ? <li>No sensitive actions yet.</li> : null}
        {data.audit.map((a, i) => <li key={i}>{a.at.slice(0, 16)} · {a.action} · {a.target} · {a.detail}</li>)}
      </ul>
    </Frame>
  );
}
