import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  getBooking,
  listNotifications,
  listProviderBookings,
  proposeRevision,
  providerEarnings,
  saveProviderProfile,
  setBookingStatus,
  submitVerification,
} from "@/lib/homely/api";
import { CATEGORIES } from "@/lib/homely/catalog";
import { CITIES } from "@/lib/homely/geo";
import { inr } from "@/lib/homely/pricing";
import {
  AppFrame,
  Button,
  DemoPill,
  Empty,
  Guard,
  PROVIDER_LINKS,
  PageSkeleton,
  fieldClass,
  toastErr,
  useAccount,
} from "@/components/homely/kit";

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return <Guard role="provider"><AppFrame title={title} links={PROVIDER_LINKS}>{children}</AppFrame></Guard>;
}

type Row = Awaited<ReturnType<typeof listProviderBookings>>[number];

export function ProviderDashboard() {
  const { profile, provider } = useAccount();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof listNotifications>>>([]);
  useEffect(() => {
    listProviderBookings().then(setRows).catch(toastErr);
    listNotifications().then(setNotes).catch(toastErr);
  }, []);
  const pending = rows?.filter((r) => r.status === "pending").length ?? 0;
  return (
    <Frame title={`Hello, ${profile?.fullName.split(" ")[0] ?? ""}`}>
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="New requests" value={String(pending)} />
        <Stat label="Trust" value={provider ? String(provider.trustScore) : "—"} />
        <Stat label="Verification" value={provider?.verificationStatus ?? "—"} />
      </div>
      {provider && !provider.skills.length ? <p className="mt-4 text-sm">Add your skills and rates on the profile page before customers can match you.</p> : null}
      <h2 className="mt-6 text-2xl text-navy">Notifications</h2>
      <ul className="mt-2 space-y-2 text-sm">{notes.slice(0, 5).map((n) => <li key={n.id}>{n.title} — {n.body}</li>)}{!notes.length ? <li className="text-muted">None yet.</li> : null}</ul>
      <Link to="/provider/requests" className="mt-4 inline-flex text-sm text-leaf underline">Open requests</Link>
    </Frame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <article className="rounded-3xl border border-line bg-paper p-4"><p className="text-sm text-muted">{label}</p><p className="mt-1 text-2xl text-navy">{value}</p></article>;
}

export function ProviderRequests() {
  const [rows, setRows] = useState<Row[] | null>(null);
  function load() { listProviderBookings().then(setRows).catch(toastErr); }
  useEffect(load, []);
  const pending = rows?.filter((r) => r.status === "pending") ?? [];
  return (
    <Frame title="Requests">
      {rows === null ? <div className="h-20 animate-pulse rounded-3xl bg-sand" /> : null}
      {pending.length === 0 && rows ? <Empty title="No open requests" body="Sample requests appear when a professional profile is created. Real customers show up here when they book you." /> : null}
      <div className="space-y-3">
        {pending.map((row) => <JobCard key={row.id} row={row} onChange={load} mode="request" />)}
      </div>
    </Frame>
  );
}

export function ProviderBookings() {
  const [rows, setRows] = useState<Row[] | null>(null);
  function load() { listProviderBookings().then(setRows).catch(toastErr); }
  useEffect(load, []);
  const active = rows?.filter((r) => r.status !== "pending") ?? [];
  return (
    <Frame title="Jobs">
      {active.length === 0 && rows ? <Empty title="No accepted jobs" body="Accept a request and it will move here." /> : null}
      <div className="space-y-3">{active.map((row) => <JobCard key={row.id} row={row} onChange={load} mode="job" />)}</div>
    </Frame>
  );
}

function JobCard({ row, onChange, mode }: { row: Row; onChange: () => void; mode: "request" | "job" }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getBooking>> | null>(null);
  const [labour, setLabour] = useState("500");
  const [materials, setMaterials] = useState("0");
  const [travel, setTravel] = useState("0");
  const [note, setNote] = useState("");

  async function act(status: "accepted" | "cancelled" | "in_progress" | "completed") {
    const result = await setBookingStatus({ data: { id: row.id, status, note: "" } });
    if (!result.ok) toast.error(result.error);
    else { toast.success("Status updated"); onChange(); if (open) setDetail(await getBooking({ data: { id: row.id } })); }
  }

  return (
    <article className="rounded-3xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl text-navy">{row.categoryName}</h2>
        {row.isDemoCustomer ? <DemoPill /> : null}
        <span className="text-xs uppercase text-muted">{row.status.replaceAll("_", " ")}</span>
      </div>
      <p className="text-sm text-muted">{row.publicId} · {row.preferredDate} · {row.timeSlot} · {row.area}, {row.city}</p>
      <p className="mt-1 text-sm">{inr(row.agreedTotalInr)} · {row.customerName}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "request" ? (
          <>
            <Button type="button" onClick={() => act("accepted").catch(toastErr)}>Accept</Button>
            <Button type="button" variant="danger" onClick={() => act("cancelled").catch(toastErr)}>Decline</Button>
          </>
        ) : null}
        {row.status === "accepted" ? <Button type="button" onClick={() => act("in_progress").catch(toastErr)}>Start visit</Button> : null}
        {row.status === "in_progress" ? <Button type="button" onClick={() => act("completed").catch(toastErr)}>Mark completed</Button> : null}
        {row.status === "accepted" || row.status === "in_progress" ? (
          <Button type="button" variant="ghost" onClick={() => act("cancelled").catch(toastErr)}>Cancel</Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => { setOpen(true); getBooking({ data: { id: row.id } }).then(setDetail).catch(toastErr); }}>Details</Button>
      </div>
      {open && detail && detail.ok ? (
        <div className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
          <p>{detail.booking.description}</p>
          <p>{String(detail.booking.address.line1)}, {String(detail.booking.address.area)} {String(detail.booking.address.pincode)}</p>
          <p>Customer phone: {detail.booking.customer.phone ? String(detail.booking.customer.phone) : "Hidden until you accept"}</p>
          {detail.images.length ? <div className="grid grid-cols-3 gap-2">{detail.images.map((src) => <img key={src.slice(0, 24)} src={src} alt="Customer photograph" className="h-20 w-full rounded-xl object-cover" />)}</div> : <p className="text-muted">No photographs, or they are hidden until you accept.</p>}
          {row.status === "accepted" || row.status === "in_progress" ? (
            <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => {
              e.preventDefault();
              proposeRevision({ data: { id: row.id, labour: Number(labour), materials: Number(materials), travel: Number(travel), note } })
                .then((r) => { if (!r.ok) toast.error(r.error); else toast.success(`Proposed ${inr(r.totalInr)}`); })
                .catch(toastErr);
            }}>
              <input className={fieldClass} value={labour} onChange={(e) => setLabour(e.target.value)} aria-label="Labour" />
              <input className={fieldClass} value={materials} onChange={(e) => setMaterials(e.target.value)} aria-label="Materials" />
              <input className={fieldClass} value={travel} onChange={(e) => setTravel(e.target.value)} aria-label="Travel" />
              <input className={fieldClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed?" aria-label="Revision note" />
              <Button type="submit" className="sm:col-span-2">Propose a new price</Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ProviderAvailability() {
  return <ProviderEditor focus="hours" />;
}

export function ProviderProfile() {
  return <ProviderEditor focus="profile" />;
}

function ProviderEditor({ focus }: { focus: "hours" | "profile" }) {
  const { provider, refresh } = useAccount();
  const [skills, setSkills] = useState<string[]>(provider?.skills ?? []);
  const [slots, setSlots] = useState<{ weekday: number; slot: string }[]>(provider?.slots ?? []);
  const [city, setCity] = useState(provider?.city ?? "Bengaluru");
  const [area, setArea] = useState(provider?.area ?? "");
  const [pincode, setPincode] = useState(provider?.pincode ?? "");
  const [experienceYears, setExperienceYears] = useState(String(provider?.experienceYears ?? 1));
  const [qualifications, setQualifications] = useState(provider?.qualifications ?? "");
  const [about, setAbout] = useState(provider?.about ?? "");
  const [radiusKm, setRadiusKm] = useState(String(provider?.radiusKm ?? 8));
  const [hourlyRateInr, setHourly] = useState(String(provider?.hourlyRateInr ?? 399));
  const [travelPerKmInr, setTravel] = useState(String(provider?.travelPerKmInr ?? 12));
  const [startingPriceInr, setStart] = useState(String(provider?.startingPriceInr ?? 349));
  const [availableNow, setAvailableNow] = useState(provider?.availableNow ?? true);
  const [docType, setDocType] = useState("Trade certificate");
  const [referenceLabel, setReferenceLabel] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (!provider) return;
    setSkills(provider.skills);
    setSlots(provider.slots);
    setCity(provider.city);
    setArea(provider.area);
    setPincode(provider.pincode);
    setAbout(provider.about);
    setQualifications(provider.qualifications);
  }, [provider?.userId]);

  function toggleSlot(weekday: number, slot: string) {
    setSlots((current) => {
      const has = current.some((s) => s.weekday === weekday && s.slot === slot);
      return has ? current.filter((s) => !(s.weekday === weekday && s.slot === slot)) : [...current, { weekday, slot }];
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = await saveProviderProfile({
      data: {
        skills, slots, city, area, pincode, experienceYears: Number(experienceYears), qualifications, about,
        radiusKm: Number(radiusKm), hourlyRateInr: Number(hourlyRateInr), travelPerKmInr: Number(travelPerKmInr),
        startingPriceInr: Number(startingPriceInr), availableNow, lat: null, lng: null,
      },
    });
    if (!result.ok) toast.error(result.error);
    else { toast.success("Profile saved"); refresh(); }
  }

  if (!provider) return <Frame title="Profile"><PageSkeleton /></Frame>;

  return (
    <Frame title={focus === "hours" ? "Availability" : "Professional profile"}>
      <form onSubmit={(e) => save(e).catch(toastErr)} className="space-y-4">
        {focus === "profile" ? (
          <div className="grid gap-2 md:grid-cols-2">
            <p className="md:col-span-2 text-sm">Status: {provider.verificationStatus}. {provider.verificationStatus === "verified" ? "Your badge is live." : "A badge appears only after an administrator approves a document."}</p>
            {CATEGORIES.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={skills.includes(c.slug)} onChange={() => setSkills((s) => s.includes(c.slug) ? s.filter((x) => x !== c.slug) : [...s, c.slug])} />
                {c.name}
              </label>
            ))}
            <select className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
            <input className={fieldClass} placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area" />
            <input className={fieldClass} placeholder="PIN" value={pincode} onChange={(e) => setPincode(e.target.value)} aria-label="PIN" />
            <input className={fieldClass} placeholder="Years" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} aria-label="Experience" />
            <input className={fieldClass} placeholder="Qualifications" value={qualifications} onChange={(e) => setQualifications(e.target.value)} aria-label="Qualifications" />
            <input className={fieldClass} placeholder="Radius km" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} aria-label="Radius" />
            <input className={fieldClass} placeholder="Hourly rate" value={hourlyRateInr} onChange={(e) => setHourly(e.target.value)} aria-label="Hourly rate" />
            <input className={fieldClass} placeholder="Travel per km" value={travelPerKmInr} onChange={(e) => setTravel(e.target.value)} aria-label="Travel rate" />
            <input className={fieldClass} placeholder="Starting price" value={startingPriceInr} onChange={(e) => setStart(e.target.value)} aria-label="Starting price" />
            <textarea className={`${fieldClass} h-24 py-2 md:col-span-2`} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="About your work" aria-label="About" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={availableNow} onChange={(e) => setAvailableNow(e.target.checked)} />Available for urgent visits</label>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="p-2 text-left">Day</th><th>Morning</th><th>Afternoon</th><th>Evening</th></tr></thead>
              <tbody>
                {DAYS.map((day, weekday) => (
                  <tr key={day}>
                    <td className="p-2">{day}</td>
                    {["morning", "afternoon", "evening"].map((slot) => (
                      <td key={slot} className="p-2 text-center">
                        <input type="checkbox" checked={slots.some((s) => s.weekday === weekday && s.slot === slot)} onChange={() => toggleSlot(weekday, slot)} aria-label={`${day} ${slot}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button type="submit">Save</Button>
      </form>
      {focus === "profile" ? (
        <form className="mt-8 max-w-lg space-y-2 rounded-3xl border border-line bg-paper p-5" onSubmit={(e) => {
          e.preventDefault();
          submitVerification({ data: { docType, referenceLabel, fileName, fileData, consent } })
            .then((r) => { if (!r.ok) toast.error(r.error); else { toast.success("Submitted for review"); refresh(); } })
            .catch(toastErr);
        }}>
          <h2 className="text-2xl text-navy">Verification</h2>
          <p className="text-xs text-muted">Do not upload Aadhaar. A 12-digit number is rejected. There is no automatic face check.</p>
          <select className={fieldClass} value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type">
            <option>Trade certificate</option>
            <option>Address proof</option>
            <option>GST certificate</option>
          </select>
          <input className={fieldClass} placeholder="Reference, not an identity number" value={referenceLabel} onChange={(e) => setReferenceLabel(e.target.value)} aria-label="Reference" />
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Document image" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 250_000) return toast.error("Keep the image under 250 KB.");
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = () => setFileData(String(reader.result));
            reader.readAsDataURL(file);
          }} />
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />I consent to an administrator reviewing this document.</label>
          <Button type="submit" variant="ghost">Submit document</Button>
        </form>
      ) : null}
      <p className="mt-4 text-xs text-muted">{provider.trustNote}</p>
    </Frame>
  );
}

export function ProviderEarnings() {
  const [data, setData] = useState<Awaited<ReturnType<typeof providerEarnings>> | null>(null);
  useEffect(() => { providerEarnings().then(setData).catch(toastErr); }, []);
  return (
    <Frame title="Earnings">
      {data && !data.ok ? <p>{data.error}</p> : null}
      {data && data.ok ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Stat label="Completed total" value={inr(data.grossInr)} />
            <Stat label="Platform fees" value={inr(data.feeInr)} />
          </div>
          <p className="mt-2 text-xs text-muted">Recorded as pay-on-completion. No payout has been transferred.</p>
          <div className="mt-4 space-y-2">
            {data.jobs.length === 0 ? <Empty title="No completed jobs" body="Finished visits appear here with the fee taken out of the estimate." /> : null}
            {data.jobs.map((job) => (
              <article key={job.publicId} className="rounded-2xl border border-line bg-paper p-4 text-sm">
                <p className="font-medium">{job.publicId} · {job.categoryName}</p>
                <p className="text-muted">{job.date} · total {inr(job.totalInr)} · fee {inr(job.platformFeeInr)} · net {inr(job.netInr)}</p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </Frame>
  );
}
