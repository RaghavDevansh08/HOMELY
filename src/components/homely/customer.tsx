import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/client";
import {
  cancelBooking,
  confirmAndReview,
  createBooking,
  decideRevision,
  deleteAddress,
  deleteReminder,
  fileComplaint,
  getCatalog,
  listAddresses,
  listCustomerBookings,
  listFavourites,
  listNotifications,
  listReminders,
  markNotificationsRead,
  previewEstimate,
  rescheduleBooking,
  saveAddress,
  saveReminder,
  searchProfessionals,
  sendMessage,
  stepDemoBooking,
  toggleFavourite,
  updateProfile,
  getBooking,
} from "@/lib/homely/api";
import { CITIES } from "@/lib/homely/geo";
import { inr } from "@/lib/homely/pricing";
import {
  AppFrame,
  Button,
  CUSTOMER_LINKS,
  DemoPill,
  Empty,
  Guard,
  Money,
  PageSkeleton,
  Verified,
  fieldClass,
  toastErr,
  useAccount,
} from "@/components/homely/kit";

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Guard role="customer">
      <AppFrame title={title} links={CUSTOMER_LINKS}>{children}</AppFrame>
    </Guard>
  );
}

export function CustomerDashboard() {
  const { profile } = useAccount();
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof listCustomerBookings>> | null>(null);
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof listNotifications>> | null>(null);
  const [reminders, setReminders] = useState<Awaited<ReturnType<typeof listReminders>> | null>(null);
  const [pros, setPros] = useState<Awaited<ReturnType<typeof searchProfessionals>>["providers"]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");

  function load() {
    listCustomerBookings().then(setBookings).catch(toastErr);
    listNotifications().then(setNotes).catch(toastErr);
    listReminders().then(setReminders).catch(toastErr);
    searchProfessionals({
      data: { category: "", place: profile?.city ?? "Bengaluru", date: "", budget: null, rating: null, slot: "", urgency: "", lat: null, lng: null },
    }).then((r) => setPros(r.providers.slice(0, 3))).catch(() => undefined);
  }
  useEffect(() => { if (profile) load(); }, [profile?.userId]);

  const upcoming = (bookings ?? []).filter((b) => b.status === "pending" || b.status === "accepted" || b.status === "in_progress");
  const past = (bookings ?? []).filter((b) => b.status === "completed" || b.status === "cancelled");

  return (
    <Frame title={`Hello, ${profile?.fullName.split(" ")[0] ?? ""}`}>
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl bg-navy p-5 text-paper lg:col-span-2">
          <p className="text-sm text-sand">Next step</p>
          <h2 className="mt-1 text-3xl">Book a visit near {profile?.city}</h2>
          <Link to="/customer/book" search={{ category: "plumbing", provider: "" }} className="mt-4 inline-flex h-11 items-center rounded-full bg-leaf px-5 text-sm text-paper">
            Find a professional
          </Link>
        </article>
        <article className="rounded-3xl border border-line bg-paper p-5">
          <h2 className="text-xl text-navy">Notifications</h2>
          <button type="button" className="text-xs text-leaf" onClick={() => markNotificationsRead().then(load).catch(toastErr)}>Mark read</button>
          <ul className="mt-3 space-y-2 text-sm">
            {notes?.length ? notes.slice(0, 4).map((n) => <li key={n.id} className={n.read ? "text-muted" : ""}>{n.title}</li>) : <li className="text-muted">Nothing new.</li>}
          </ul>
        </article>
      </div>
      <h2 className="mt-8 text-2xl text-navy">Suggested near you</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {pros.map((p) => (
          <Link key={p.userId} to="/customer/book" search={{ category: p.skills[0] ?? "maintenance", provider: p.userId }} className="rounded-3xl border border-line bg-paper p-4">
            <div className="flex items-center gap-2"><p className="font-medium">{p.name}</p>{p.isDemo ? <DemoPill /> : null}</div>
            <p className="text-sm text-muted">{p.reason}</p>
            <p className="mt-1 text-sm">From <Money value={p.startingPriceInr} /></p>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <BookingColumn title="Upcoming" rows={upcoming} />
        <BookingColumn title="Past" rows={past} />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <form className="space-y-2 rounded-3xl border border-line bg-paper p-5" onSubmit={(e) => { e.preventDefault(); saveReminder({ data: { title, dueOn, categorySlug: null, notes: "" } }).then(() => { toast.success("Reminder saved"); setTitle(""); load(); }).catch(toastErr); }}>
          <h2 className="text-xl text-navy">Maintenance reminder</h2>
          <p className="text-xs text-muted">Saved in your account. Homely will not send an SMS.</p>
          <input className={fieldClass} placeholder="AC service" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Reminder title" />
          <input type="date" className={fieldClass} value={dueOn} onChange={(e) => setDueOn(e.target.value)} aria-label="Due date" />
          <Button type="submit">Save reminder</Button>
          <ul className="text-sm">
            {reminders?.map((r) => (
              <li key={r.id} className="mt-2 flex items-center justify-between gap-2">
                <span>{r.title} · {r.dueOn}</span>
                <button type="button" className="text-danger" onClick={() => deleteReminder({ data: { id: r.id } }).then(load)}>Remove</button>
              </li>
            ))}
          </ul>
        </form>
        <form className="space-y-2 rounded-3xl border border-line bg-paper p-5" onSubmit={(e) => { e.preventDefault(); fileComplaint({ data: { subject, body, bookingId: null } }).then(() => { toast.success("Sent to support"); setSubject(""); setBody(""); }).catch(toastErr); }}>
          <h2 className="text-xl text-navy">Report a problem</h2>
          <input className={fieldClass} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
          <textarea className={`${fieldClass} h-24 py-2`} placeholder="What happened?" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Complaint" />
          <Button type="submit" variant="ghost">Send to admin</Button>
        </form>
      </div>
    </Frame>
  );
}

function BookingColumn({ title, rows }: { title: string; rows: Awaited<ReturnType<typeof listCustomerBookings>> }) {
  return (
    <section>
      <h2 className="text-2xl text-navy">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
        {rows.slice(0, 5).map((b) => (
          <Link key={b.id} to="/customer/bookings/$id" params={{ id: String(b.id) }} className="block rounded-2xl border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{b.categoryName}</p>
              <span className="text-xs uppercase text-muted">{b.status.replaceAll("_", " ")}</span>
            </div>
            <p className="text-sm text-muted">{b.publicId} · {b.preferredDate} · {b.providerName}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CustomerBookings() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listCustomerBookings>> | null>(null);
  useEffect(() => { listCustomerBookings().then(setRows).catch(toastErr); }, []);
  return (
    <Frame title="Bookings">
      {rows === null ? <div className="h-24 animate-pulse rounded-3xl bg-sand" /> : null}
      {rows?.length === 0 ? <Empty title="No bookings yet" body="When you confirm an estimate, the visit shows up here with its id." action={<Link to="/customer/book" search={{ category: "plumbing", provider: "" }} className="text-leaf underline">Start a booking</Link>} /> : null}
      <div className="space-y-3">
        {rows?.map((b) => (
          <Link key={b.id} to="/customer/bookings/$id" params={{ id: String(b.id) }} className="block rounded-3xl border border-line bg-paper p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl text-navy">{b.categoryName}</h2>
              {b.isDemoProvider ? <DemoPill /> : null}
            </div>
            <p className="text-sm text-muted">{b.publicId} · {b.status.replaceAll("_", " ")} · {b.preferredDate} {b.timeSlot}</p>
            <p className="mt-1 text-sm">{b.providerName} · <Money value={b.agreedTotalInr} /></p>
          </Link>
        ))}
      </div>
    </Frame>
  );
}

type Detail = Awaited<ReturnType<typeof getBooking>>;

export function CustomerBookingDetail({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("morning");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  function load() {
    getBooking({ data: { id: Number(id) } }).then(setData).catch(toastErr);
  }
  useEffect(() => { load(); }, [id]);

  return (
    <Frame title="Booking">
      {data === null ? <PageSkeleton /> : null}
      {data && !data.ok ? <Empty title="Unavailable" body={data.error} /> : null}
      {data && data.ok ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-paper p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl text-navy">{data.booking.publicId}</h2>
              {data.booking.isDemoProvider ? <DemoPill /> : null}
              <span className="rounded-full bg-sand px-2 py-0.5 text-xs uppercase">{data.booking.status.replaceAll("_", " ")}</span>
            </div>
            <p className="mt-2 text-sm">{data.booking.categoryName} · {data.booking.preferredDate} · {data.booking.timeSlot} · {data.booking.urgency.replaceAll("_", " ")}</p>
            <p className="mt-2 text-sm text-muted">{data.booking.description}</p>
            <p className="mt-3 text-lg"><Money value={data.booking.agreedTotalInr} /></p>
            <p className="text-sm text-muted">with {String(data.booking.provider.name)} {data.booking.provider.phoneNote ? `· ${data.booking.provider.phoneNote}` : ""} {data.booking.provider.phone ? `· ${data.booking.provider.phone}` : ""}</p>
            <address className="mt-2 text-sm not-italic text-muted">
              {String(data.booking.address.line1 ?? "")}, {String(data.booking.address.area ?? "")}, {String(data.booking.address.city ?? "")} {String(data.booking.address.pincode ?? "")}
            </address>
          </div>
          <ol className="space-y-2">
            {data.history.map((h, i) => (
              <li key={i} className="rounded-2xl bg-paper px-4 py-3 text-sm">
                <span className="font-medium uppercase">{h.status.replaceAll("_", " ")}</span>
                <span className="text-muted"> · {new Date(h.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                <p>{h.note}</p>
              </li>
            ))}
          </ol>
          <EstimateView estimate={data.booking.estimate} />
          {data.booking.revisionStatus === "pending_customer" && data.booking.revisedEstimate ? (
            <div className="rounded-3xl border border-line bg-sand p-5">
              <h3 className="text-xl text-navy">Revised price needs your approval</h3>
              <EstimateView estimate={data.booking.revisedEstimate} />
              <div className="mt-3 flex gap-2">
                <Button type="button" onClick={() => decideRevision({ data: { id: data.booking.id, approve: true } }).then(() => { toast.success("Revision approved"); load(); }).catch(toastErr)}>Approve</Button>
                <Button type="button" variant="ghost" onClick={() => decideRevision({ data: { id: data.booking.id, approve: false } }).then(load).catch(toastErr)}>Keep original</Button>
              </div>
            </div>
          ) : null}
          {data.images.length ? (
            <div className="grid grid-cols-3 gap-2">
              {data.images.map((src, i) => <img key={i} src={src} alt="Job photograph" className="h-28 w-full rounded-2xl object-cover" />)}
            </div>
          ) : null}
          {data.booking.isDemoProvider && data.booking.status !== "completed" && data.booking.status !== "cancelled" ? (
            <Button type="button" onClick={() => stepDemoBooking({ data: { id: data.booking.id } }).then(() => { toast.success("Demo visit stepped forward"); load(); }).catch(toastErr)}>
              Step demo professional
            </Button>
          ) : null}
          {data.cancel ? (
            <form className="space-y-2 rounded-3xl border border-line bg-paper p-5" onSubmit={(e) => { e.preventDefault(); cancelBooking({ data: { id: data.booking.id, reason } }).then((r) => { if (!r.ok) toast.error(r.error); else { toast.success(r.detail); load(); } }).catch(toastErr); }}>
              <h3 className="text-xl text-navy">Cancel</h3>
              <p className="text-sm text-muted">{data.cancel.detail}</p>
              <input className={fieldClass} placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Cancellation reason" />
              <Button type="submit" variant="danger">Confirm cancellation {data.cancel.feeInr ? `(${inr(data.cancel.feeInr)})` : ""}</Button>
            </form>
          ) : null}
          {data.booking.status === "pending" || data.booking.status === "accepted" ? (
            <form className="grid gap-2 rounded-3xl border border-line bg-paper p-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); rescheduleBooking({ data: { id: data.booking.id, date, slot } }).then((r) => { if (!r.ok) toast.error(r.error); else { toast.success("Rescheduled"); load(); } }).catch(toastErr); }}>
              <h3 className="text-xl text-navy sm:col-span-3">Reschedule</h3>
              <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} required aria-label="New date" />
              <select className={fieldClass} value={slot} onChange={(e) => setSlot(e.target.value)} aria-label="New slot">
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
              <Button type="submit">Update slot</Button>
            </form>
          ) : null}
          <div className="rounded-3xl border border-line bg-paper p-5">
            <h3 className="text-xl text-navy">Messages</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {data.messages.map((m) => <li key={m.id} className={m.mine ? "text-navy" : "text-muted"}>{m.body}</li>)}
              {!data.messages.length ? <li className="text-muted">No messages yet. This is the in-app channel. SMS is not connected.</li> : null}
            </ul>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); sendMessage({ data: { id: data.booking.id, body: message } }).then((r) => { if (!r.ok) toast.error(r.error); else { setMessage(""); load(); } }).catch(toastErr); }}>
              <input className={fieldClass} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a message" aria-label="Message" />
              <Button type="submit">Send</Button>
            </form>
          </div>
          {data.booking.status === "completed" ? (
            <div className="rounded-3xl border border-line bg-paper p-5">
              <h3 className="text-xl text-navy">Receipt</h3>
              <p className="text-sm text-muted">Pay on completion. No card was charged. This is the service record for {data.booking.publicId}.</p>
              <EstimateView estimate={data.booking.estimate} />
              <p className="mt-2 text-sm">{data.booking.customerConfirmed ? "You confirmed completion." : "You have not confirmed completion yet."}</p>
              {data.review ? <p className="mt-2 text-sm">Your review: {data.review.rating}/5 — {data.review.body}</p> : (
                <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); confirmAndReview({ data: { id: data.booking.id, rating, body: review, confirm: true } }).then((r) => { if (!r.ok) toast.error(r.error); else { toast.success("Review saved"); load(); } }).catch(toastErr); }}>
                  <label className="text-sm">Rating
                    <select className={`${fieldClass} mt-1`} value={rating} onChange={(e) => setRating(Number(e.target.value))} aria-label="Rating">
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <textarea className={`${fieldClass} h-24 py-2`} value={review} onChange={(e) => setReview(e.target.value)} placeholder="How was the visit?" aria-label="Review" />
                  <Button type="submit">Confirm completion and review</Button>
                </form>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </Frame>
  );
}

function EstimateView({ estimate }: { estimate: unknown }) {
  const data = estimate as { lines?: { key: string; label: string; amountInr: number; note?: string }[]; totalInr?: number; assumptions?: string[]; duration?: { label?: string; minutes?: number; low?: number; high?: number; source?: string } };
  if (!data?.lines) return null;
  return (
    <div className="mt-3 text-sm">
      <ul className="space-y-1">
        {data.lines.map((line) => (
          <li key={line.key} className="flex justify-between gap-3">
            <span>{line.label} <span className="text-muted">· {line.note}</span></span>
            <span className="tabular-nums">{inr(line.amountInr)}</span>
          </li>
        ))}
      </ul>
      {data.totalInr != null ? <p className="mt-2 font-medium">Estimated total {inr(data.totalInr)}</p> : null}
      {data.duration?.label ? <p className="mt-2 text-muted">{data.duration.label} About {data.duration.low}–{data.duration.high} min ({data.duration.source === "sklearn" ? "model" : "preliminary"}).</p> : null}
      {data.assumptions?.map((a) => <p key={a} className="text-xs text-muted">{a}</p>)}
    </div>
  );
}

type Addr = Awaited<ReturnType<typeof listAddresses>>[number];

export function CustomerAddresses() {
  const [rows, setRows] = useState<Addr[] | null>(null);
  const [form, setForm] = useState({ label: "Home", line1: "", area: "", city: "Bengaluru", pincode: "", lat: "", lng: "", isDefault: true, consent: false });
  function load() { listAddresses().then(setRows).catch(toastErr); }
  useEffect(load, []);

  function locate() {
    if (!form.consent) return toast.error("Allow location for this address first.");
    if (!navigator.geolocation) return toast.error("This browser has no location service.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) })),
      () => toast.error("Location was blocked. You can still save the PIN."),
    );
  }

  return (
    <Frame title="Addresses">
      <form className="grid gap-2 rounded-3xl border border-line bg-paper p-5 md:grid-cols-2" onSubmit={(e) => {
        e.preventDefault();
        saveAddress({ data: { ...form, lat: form.lat || null, lng: form.lng || null, id: null } }).then((r) => {
          if (!r.ok) toast.error(r.error); else { toast.success("Address saved"); load(); }
        }).catch(toastErr);
      }}>
        <input className={fieldClass} placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} aria-label="Label" />
        <input className={fieldClass} placeholder="Street" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} aria-label="Street" />
        <input className={fieldClass} placeholder="Locality" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} aria-label="Locality" />
        <select className={fieldClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} aria-label="City">{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        <input className={fieldClass} placeholder="PIN code" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} aria-label="PIN code" />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
          I agree to attach my browser location to this address.
        </label>
        <Button type="button" variant="ghost" onClick={locate}>Use my location</Button>
        <Button type="submit">Save address</Button>
      </form>
      <div className="mt-4 space-y-2">
        {rows?.length === 0 ? <Empty title="No saved addresses" body="Add the homes you book for. You can still type an address during booking." /> : null}
        {rows?.map((a) => (
          <article key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-paper p-4 text-sm">
            <p><span className="font-medium">{a.label}</span>{a.isDefault ? " · default" : ""}<br />{a.line1}, {a.area}, {a.city} {a.pincode}</p>
            <button type="button" className="text-danger" onClick={() => deleteAddress({ data: { id: a.id } }).then(load)}>Delete</button>
          </article>
        ))}
      </div>
    </Frame>
  );
}

export function CustomerFavourites() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listFavourites>> | null>(null);
  function load() { listFavourites().then(setRows).catch(toastErr); }
  useEffect(load, []);
  return (
    <Frame title="Saved professionals">
      {rows?.length === 0 ? <Empty title="None saved" body="Save a professional from the booking list." /> : null}
      <div className="space-y-3">
        {rows?.map((p) => (
          <article key={p.userId} className="rounded-3xl border border-line bg-paper p-4">
            <div className="flex items-center gap-2"><h2 className="text-xl text-navy">{p.name}</h2><Verified status={p.verificationStatus} />{p.isDemo ? <DemoPill /> : null}</div>
            <p className="text-sm text-muted">{p.area}, {p.city}</p>
            <button type="button" className="mt-2 text-sm text-danger" onClick={() => toggleFavourite({ data: { providerUserId: p.userId } }).then(load)}>Remove</button>
          </article>
        ))}
      </div>
    </Frame>
  );
}

export function CustomerProfile() {
  const { profile, refresh } = useAccount();
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [city, setCity] = useState(profile?.city ?? "Bengaluru");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  useEffect(() => {
    setFullName(profile?.fullName ?? "");
    setPhone(profile?.phone ?? "");
    setCity(profile?.city ?? "Bengaluru");
    setBio(profile?.bio ?? "");
  }, [profile?.userId]);
  return (
    <Frame title="Profile">
      <form className="max-w-lg space-y-2" onSubmit={(e) => { e.preventDefault(); updateProfile({ data: { fullName, phone, city, bio } }).then((r) => { if (!r.ok) toast.error(r.error); else { toast.success("Saved"); refresh(); } }).catch(toastErr); }}>
        <input className={fieldClass} value={fullName} onChange={(e) => setFullName(e.target.value)} aria-label="Name" />
        <input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile" aria-label="Mobile" />
        <select className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        <textarea className={`${fieldClass} h-24 py-2`} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short note" aria-label="Bio" />
        <Button type="submit">Save profile</Button>
      </form>
      <form className="mt-8 max-w-lg space-y-2" onSubmit={async (e) => {
        e.preventDefault();
        const result = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
        if (result.error) toast.error(result.error.message ?? "Could not change the password.");
        else { toast.success("Password updated"); setCurrent(""); setNext(""); }
      }}>
        <h2 className="text-2xl text-navy">Change password</h2>
        <p className="text-xs text-muted">Works for email accounts. Google and X passwords are managed by those providers.</p>
        <input type="password" className={fieldClass} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" aria-label="Current password" />
        <input type="password" className={fieldClass} value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password" aria-label="New password" />
        <Button type="submit" variant="ghost">Update password</Button>
      </form>
    </Frame>
  );
}

const emptySearch = { category: "", place: "", date: "", budget: null as number | null, rating: null as number | null, slot: "" as const, urgency: "" as const, lat: null as number | null, lng: null as number | null };

export function BookWizard({ category, provider }: { category: string; provider: string }) {
  const { profile } = useAccount();
  const [step, setStep] = useState(1);
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof getCatalog>> | null>(null);
  const [form, setForm] = useState({
    category: category || "plumbing",
    providerUserId: provider,
    line1: "",
    area: "",
    city: profile?.city || "Bengaluru",
    pincode: "",
    lat: "" as string,
    lng: "" as string,
    consent: false,
    description: "",
    date: "",
    slot: "morning",
    urgency: "standard",
    images: [] as string[],
    saveAddress: false,
  });
  const [pros, setPros] = useState<Awaited<ReturnType<typeof searchProfessionals>>["providers"]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof previewEstimate>> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getCatalog().then(setCatalog).catch(toastErr); }, []);
  useEffect(() => { if (category) setForm((f) => ({ ...f, category })); if (provider) setForm((f) => ({ ...f, providerUserId: provider })); }, [category, provider]);

  async function loadPros() {
    setBusy(true);
    try {
      const result = await searchProfessionals({
        data: { ...emptySearch, category: form.category, place: `${form.city} ${form.pincode}`, date: form.date, slot: form.slot as "morning", urgency: form.urgency as "standard", lat: form.lat ? Number(form.lat) : null, lng: form.lng ? Number(form.lng) : null },
      });
      setPros(result.providers);
      if (!form.providerUserId && result.providers[0]) setForm((f) => ({ ...f, providerUserId: result.providers[0].userId }));
    } catch (error) {
      toastErr(error);
    } finally {
      setBusy(false);
    }
  }

  async function loadQuote(id = form.providerUserId) {
    setBusy(true);
    try {
      const result = await previewEstimate({
        data: { providerUserId: id, category: form.category, urgency: form.urgency, slot: form.slot, date: form.date, place: `${form.city} ${form.pincode}`, lat: form.lat || null, lng: form.lng || null },
      });
      setQuote(result);
    } catch (error) {
      toastErr(error);
    } finally {
      setBusy(false);
    }
  }

  function locate() {
    if (!form.consent) return toast.error("Tick consent before using location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) })),
      () => toast.error("Location permission was denied."),
    );
  }

  function readFiles(files: FileList | null) {
    if (!files) return;
    const list = [...files].slice(0, 3);
    Promise.all(list.map((file) => new Promise<string>((resolve, reject) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return reject(new Error("Use JPG, PNG, or WebP."));
      if (file.size > 250_000) return reject(new Error("Keep each photo under 250 KB."));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the photo."));
      reader.readAsDataURL(file);
    }))).then((images) => setForm((f) => ({ ...f, images }))).catch(toastErr);
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await createBooking({
        data: { ...form, lat: form.lat || null, lng: form.lng || null, images: form.images.map((dataUrl) => ({ dataUrl })) },
      });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(`Booked ${result.publicId}`);
      window.location.href = `/customer/bookings/${result.id}`;
    } catch (error) {
      toastErr(error);
    } finally {
      setBusy(false);
    }
  }

  const chosen = pros.find((p) => p.userId === form.providerUserId) ?? pros[0];
  const compared = pros.filter((p) => compare.includes(p.userId));

  return (
    <Frame title="Book a visit">
      <ol className="mb-4 flex flex-wrap gap-2 text-xs text-muted">
        {["Service", "Address", "Details", "Photos", "Professionals", "Compare", "Price", "Confirm"].map((label, i) => (
          <li key={label} className={step === i + 1 ? "rounded-full bg-navy px-2 py-1 text-paper" : "rounded-full bg-sand px-2 py-1"}>{i + 1}. {label}</li>
        ))}
      </ol>
      {step === 1 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {catalog?.categories.filter((c) => c.active).map((c) => (
            <button type="button" key={c.slug} onClick={() => setForm({ ...form, category: c.slug })} className={`rounded-2xl border p-4 text-left ${form.category === c.slug ? "border-navy bg-paper" : "border-line bg-paper"}`}>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted">From {inr(c.startingPriceInr)}</p>
            </button>
          ))}
          <Button type="button" onClick={() => setStep(2)}>Continue</Button>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="grid max-w-xl gap-2">
          <input className={fieldClass} placeholder="Street and flat" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} aria-label="Street" />
          <input className={fieldClass} placeholder="Locality" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} aria-label="Locality" />
          <select className={fieldClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} aria-label="City">{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
          <input className={fieldClass} placeholder="PIN code" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} aria-label="PIN code" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />Use my location for this search. Optional.</label>
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={locate}>Use location</Button><Button type="button" onClick={() => setStep(3)}>Continue</Button></div>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="grid max-w-xl gap-2">
          <textarea className={`${fieldClass} h-28 py-2`} placeholder="Describe the issue" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-label="Issue" />
          <input type="date" className={fieldClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="Date" />
          <select className={fieldClass} value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })} aria-label="Slot">
            <option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option>
          </select>
          <select className={fieldClass} value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} aria-label="Urgency">
            <option value="standard">Standard</option><option value="same_day">Same day</option><option value="emergency">Emergency</option>
          </select>
          <Button type="button" onClick={() => setStep(4)}>Continue</Button>
        </div>
      ) : null}
      {step === 4 ? (
        <div className="max-w-xl space-y-3">
          <p className="text-sm text-muted">Optional. JPG, PNG, or WebP, under 250 KB each, up to three.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => readFiles(e.target.files)} aria-label="Photos" />
          <div className="grid grid-cols-3 gap-2">{form.images.map((src) => <img key={src.slice(0, 32)} src={src} alt="Upload preview" className="h-20 w-full rounded-xl object-cover" />)}</div>
          <Button type="button" onClick={() => { setStep(5); void loadPros(); }}>See professionals</Button>
        </div>
      ) : null}
      {step === 5 ? (
        <div className="space-y-3">
          {busy && !pros.length ? <div className="h-24 animate-pulse rounded-3xl bg-sand" /> : null}
          {pros.map((p) => (
            <label key={p.userId} className={`block rounded-3xl border p-4 ${form.providerUserId === p.userId ? "border-navy bg-paper" : "border-line bg-paper"}`}>
              <input type="radio" name="pro" className="mr-2" checked={form.providerUserId === p.userId} onChange={() => setForm({ ...form, providerUserId: p.userId })} />
              <span className="font-medium">{p.name}</span> {p.isDemo ? <DemoPill /> : null} <Verified status={p.verificationStatus} />
              <p className="text-sm text-leaf">{p.reason}</p>
              <p className="text-sm text-muted">{p.arrivalNote} · {p.experienceYears} yrs · from {inr(p.startingPriceInr)} · trust {p.trustScore} · {p.distanceKm ?? "—"} km</p>
              <button type="button" className="text-xs text-navy underline" onClick={() => setCompare((ids) => ids.includes(p.userId) ? ids.filter((id) => id !== p.userId) : ids.length >= 3 ? ids : [...ids, p.userId])}>
                {compare.includes(p.userId) ? "Remove from compare" : "Add to compare"}
              </button>
              <button type="button" className="ml-3 text-xs text-navy underline" onClick={() => toggleFavourite({ data: { providerUserId: p.userId } }).then((r) => r.ok && toast.success(r.saved ? "Saved" : "Removed")).catch(toastErr)}>Save</button>
            </label>
          ))}
          {!pros.length && !busy ? <Empty title="No professionals in range" body="Try another city or category. Demo profiles cover the major cities." /> : null}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(6)}>Compare</Button>
            <Button type="button" onClick={() => { setStep(7); void loadQuote(); }} disabled={!form.providerUserId}>See price</Button>
          </div>
        </div>
      ) : null}
      {step === 6 ? (
        <div>
          {compared.length < 2 ? <p className="text-sm text-muted">Add at least two professionals on the previous step.</p> : (
            <div className="overflow-x-auto rounded-3xl border border-line bg-paper">
              <table className="w-full text-left text-sm">
                <thead><tr>{compared.map((p) => <th key={p.userId} className="p-3">{p.name}</th>)}</tr></thead>
                <tbody>
                  <tr>{compared.map((p) => <td key={p.userId} className="p-3">{p.reason}</td>)}</tr>
                  <tr>{compared.map((p) => <td key={p.userId} className="p-3">{inr(p.startingPriceInr)} start · trust {p.trustScore}</td>)}</tr>
                  <tr>{compared.map((p) => <td key={p.userId} className="p-3">{p.distanceKm ?? "—"} km · {p.experienceYears} yrs</td>)}</tr>
                  <tr>{compared.map((p) => <td key={p.userId} className="p-3"><Button type="button" onClick={() => { setForm({ ...form, providerUserId: p.userId }); setStep(7); void loadQuote(p.userId); }}>Choose</Button></td>)}</tr>
                </tbody>
              </table>
            </div>
          )}
          <Button type="button" variant="ghost" className="mt-3" onClick={() => setStep(5)}>Back</Button>
        </div>
      ) : null}
      {step === 7 && quote && quote.ok ? (
        <div className="max-w-xl rounded-3xl border border-line bg-paper p-5">
          <h2 className="text-2xl text-navy">{quote.providerName}</h2>
          <p className="text-sm text-muted">About {quote.distanceKm} km. Rule-based match{chosen ? `: ${chosen.reason}` : ""}.</p>
          <EstimateView estimate={quote.estimate} />
          <Button type="button" className="mt-4" onClick={() => setStep(8)}>Continue to confirm</Button>
        </div>
      ) : null}
      {step === 7 && quote && !quote.ok ? <p className="text-sm text-danger">{quote.error}</p> : null}
      {step === 8 && quote && quote.ok ? (
        <form onSubmit={confirm} className="max-w-xl space-y-3 rounded-3xl border border-line bg-paper p-5">
          <h2 className="text-2xl text-navy">Confirm {quote.providerName}</h2>
          <p className="text-sm">{form.line1}, {form.area}, {form.city} {form.pincode}</p>
          <p className="text-sm">{form.date} · {form.slot} · {form.category}</p>
          <p className="text-lg">Estimated total <Money value={quote.estimate.totalInr} /></p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.saveAddress} onChange={(e) => setForm({ ...form, saveAddress: e.target.checked })} />Save this address</label>
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create booking"}</Button>
        </form>
      ) : null}
    </Frame>
  );
}
