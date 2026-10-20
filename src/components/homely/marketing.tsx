import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, MapPin, BadgeCheck, Clock3 } from "lucide-react";
import { getCatalog, getProfessional, searchProfessionals } from "@/lib/homely/api";
import { CITIES } from "@/lib/homely/geo";
import { inr } from "@/lib/homely/pricing";
import {
  Button,
  CategoryIcon,
  DemoPill,
  Empty,
  Money,
  PageSkeleton,
  Stars,
  Verified,
  fieldClass,
} from "@/components/homely/kit";

type Catalog = Awaited<ReturnType<typeof getCatalog>>;
type Pro = Awaited<ReturnType<typeof searchProfessionals>>["providers"][number];

const FAQ = [
  ["How are prices calculated?", "Labour, an estimated material buffer, travel beyond 3 km, an urgency charge when you ask for one, the platform fee, and indicative GST. You see every line before you confirm. It is an estimate, not a locked quote."],
  ["When is a professional verified?", "Only after they submit a document with consent and an administrator approves it. Homely does not store full Aadhaar numbers and will not show a badge for a check that did not happen."],
  ["Can I cancel?", "Yes, while a visit is pending or accepted. Inside the free window a cancellation charge is calculated and shown before you confirm. Nothing is charged to a card."],
  ["Do you track my location?", "Only if you allow it for one search or address. City and PIN matching works without it. There is no live maps provider, so distances are approximate."],
  ["What is a demo profile?", "Sample professionals, reviews, and complaints are labelled Demo or Sample. They let you walk through booking without a second person. Stepping a demo visit is a simulation."],
];

export function HomePage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [pros, setPros] = useState<Pro[]>([]);
  const [service, setService] = useState("plumbing");
  const [place, setPlace] = useState("Bengaluru");
  const [date, setDate] = useState("");

  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setCatalog(null));
    searchProfessionals({ data: { category: "", place: "Bengaluru", date: "", budget: null, rating: null, slot: "", urgency: "", lat: null, lng: null } })
      .then((r) => setPros(r.providers.slice(0, 4)))
      .catch(() => setPros([]));
  }, []);

  function find(event: FormEvent) {
    event.preventDefault();
    navigate({ to: "/services", search: { category: service, place, date, budget: "", rating: "", slot: "", urgency: "" } });
  }

  const categories = catalog?.categories.filter((c) => c.active) ?? [];

  return (
    <main>
      <p className="bg-navy-deep px-4 py-2 text-center text-xs text-sand">Estimates in rupees · Demo profiles and sample reviews are labelled</p>
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div>
          <p className="text-sm font-medium text-leaf">Trusted help. Right around the corner.</p>
          <h1 className="mt-3 text-4xl text-navy sm:text-5xl">Your home deserves the best care.</h1>
          <p className="mt-4 max-w-xl text-base text-muted">
            Homely connects you with nearby household professionals for plumbing, electrical work, cleaning, and the rest of the list. Compare estimates, book a slot, and follow the visit from request to review.
          </p>
          <form onSubmit={find} className="mt-6 grid gap-3 rounded-3xl border border-line bg-paper p-4 sm:grid-cols-2">
            <label className="text-sm text-muted">
              Service
              <select className={`${fieldClass} mt-1`} value={service} onChange={(e) => setService(e.target.value)} aria-label="Service">
                {(categories.length ? categories : [{ slug: "plumbing", name: "Plumbing" }]).map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              City or PIN
              <input className={`${fieldClass} mt-1`} list="cities" value={place} onChange={(e) => setPlace(e.target.value)} aria-label="City or PIN code" />
              <datalist id="cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
            </label>
            <label className="text-sm text-muted sm:col-span-2">
              Preferred date
              <input type="date" className={`${fieldClass} mt-1`} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Preferred date" />
            </label>
            <Button type="submit" className="sm:col-span-2">Find a professional</Button>
          </form>
          <Link to="/become-provider" className="mt-3 inline-flex text-sm text-navy underline">Become a provider</Link>
        </div>
        <div className="relative">
          <img src="/media/hero.jpg" alt="Sunlit living room with teak furniture and plants" className="h-80 w-full rounded-3xl object-cover sm:h-[28rem]" />
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-paper/95 p-4">
            <p className="text-sm text-muted">A neighbourhood visit, not a call centre.</p>
            <p className="font-display text-xl text-navy">Search, compare, book, track, review.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl text-navy">Popular services</h2>
          <Link to="/services" search={{ category: "", place: "", date: "", budget: "", rating: "", slot: "", urgency: "" }} className="text-sm text-leaf">All services</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 6).map((c) => (
            <Link key={c.slug} to="/services/$slug" params={{ slug: c.slug }} className="group overflow-hidden rounded-3xl border border-line bg-paper">
              <img src={c.image} alt="" className="h-40 w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
              <div className="p-4">
                <div className="flex items-center gap-2 text-navy">
                  <CategoryIcon slug={c.slug} className="h-4 w-4" />
                  <h3 className="text-xl">{c.name}</h3>
                </div>
                <p className="mt-1 text-sm text-muted">{c.description}</p>
                <p className="mt-3 text-sm">From <Money value={c.startingPriceInr} /></p>
              </div>
            </Link>
          ))}
          {!catalog ? <div className="h-64 animate-pulse rounded-3xl bg-sand sm:col-span-2 lg:col-span-3" /> : null}
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-5">
          {["Search", "Compare", "Book", "Track", "Review"].map((step, i) => (
            <div key={step}>
              <p className="text-sm text-leaf">0{i + 1}</p>
              <h3 className="mt-1 text-2xl text-navy">{step}</h3>
              <p className="mt-2 text-sm text-muted">
                {["Tell us the job, the area, and when you need someone.", "See ratings, arrival notes, and a reason for each match.", "Approve an itemised estimate before anything is confirmed.", "Follow pending, accepted, in progress, and completed.", "Confirm the visit and leave a review that counts."][i]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-3xl text-navy">Featured nearby professionals</h2>
        <p className="mt-2 text-sm text-muted">Showing Bengaluru. Distances are approximate. Ranking is rule-based, not a machine-learning score.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {pros.map((p) => <ProCard key={p.userId} pro={p} />)}
          {!pros.length ? <div className="h-32 animate-pulse rounded-3xl bg-sand md:col-span-2" /> : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 md:grid-cols-3">
        {[
          [ShieldCheck, "Checked, not claimed", "A verified badge means an administrator reviewed a consented document. Open complaints do not lower trust."],
          [BadgeCheck, "Estimate before you commit", "Labour, materials, travel, urgency, platform fee, and GST are listed. Revisions need your approval."],
          [MapPin, "Local on purpose", "City, PIN, and optional browser location. No silent GPS, and no live map tiles until a provider is connected."],
        ].map(([Icon, title, body]) => (
          <article key={String(title)} className="rounded-3xl border border-line bg-paper p-5">
            <Icon className="h-5 w-5 text-leaf" />
            <h3 className="mt-3 text-2xl text-navy">{String(title)}</h3>
            <p className="mt-2 text-sm text-muted">{String(body)}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-3xl text-navy">What customers say</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["Sample review", "The estimate matched the visit, and I could see each status change.", "Priya, Bengaluru"],
            ["Sample review", "I compared two electricians and picked the one free this evening.", "Rahul, Mumbai"],
            ["Sample review", "Cancellation showed the fee before I confirmed. Nothing was charged to a card.", "Ananya, Pune"],
          ].map(([tag, quote, who]) => (
            <blockquote key={who} className="rounded-3xl bg-sand p-5">
              <DemoPill /> <span className="text-xs text-warn">{tag}</span>
              <p className="mt-3 text-ink">“{quote}”</p>
              <footer className="mt-3 text-sm text-muted">{who}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="text-3xl text-navy">Questions</h2>
        <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-paper">
          {FAQ.map(([q, a]) => (
            <details key={q} className="px-5 py-4">
              <summary className="cursor-pointer text-sm font-medium text-navy">{q}</summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ProCard({ pro }: { pro: Pro }) {
  return (
    <article className="flex gap-4 rounded-3xl border border-line bg-paper p-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-leaf-soft font-display text-xl text-leaf">
        {pro.name.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl text-navy">{pro.name}</h3>
          <Verified status={pro.verificationStatus} />
          {pro.isDemo ? <DemoPill /> : null}
        </div>
        <p className="mt-1 text-sm text-muted">{pro.area}, {pro.city} · {pro.experienceYears} yrs</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <Stars value={pro.avgRating} />
          <span className="text-muted">{pro.reviewCount} reviews</span>
          <span>From <Money value={pro.startingPriceInr} /></span>
        </div>
        <p className="mt-2 text-sm text-leaf">{pro.reason}</p>
        <p className="text-sm text-muted">{pro.arrivalNote} {pro.availableNow ? "Available now." : "By appointment."}</p>
        {pro.isDemo ? <p className="mt-1 text-xs text-warn">Sample history of {pro.jobsCompleted} jobs — not a live record.</p> : null}
        <Link to="/customer/book" search={{ category: pro.skills[0] ?? "maintenance", provider: pro.userId }} className="mt-3 inline-flex text-sm text-navy underline">
          Book {pro.name.split(" ")[0]}
        </Link>
      </div>
    </article>
  );
}

export function ServicesPage({
  search,
}: {
  search: { category: string; place: string; date: string; budget: string; rating: string; slot: string; urgency: string };
}) {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [pros, setPros] = useState<Pro[] | null>(null);
  const [note, setNote] = useState("");
  const [placeLabel, setPlaceLabel] = useState("");
  const [draft, setDraft] = useState(search);

  useEffect(() => setDraft(search), [search]);

  useEffect(() => {
    let live = true;
    setPros(null);
    getCatalog().then((c) => live && setCatalog(c)).catch(() => undefined);
    searchProfessionals({
      data: {
        category: search.category,
        place: search.place,
        date: search.date,
        budget: search.budget ? Number(search.budget) : null,
        rating: search.rating ? Number(search.rating) : null,
        slot: search.slot as "" | "morning" | "afternoon" | "evening",
        urgency: search.urgency as "" | "standard" | "same_day" | "emergency",
        lat: null,
        lng: null,
      },
    })
      .then((r) => {
        if (!live) return;
        setPros(r.providers);
        setNote(r.note);
        setPlaceLabel(r.placeLabel);
      })
      .catch(() => live && setPros([]));
    return () => {
      live = false;
    };
  }, [search]);

  function apply(event: FormEvent) {
    event.preventDefault();
    navigate({ to: "/services", search: draft });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl text-navy">Services</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Filter by category, place, budget, rating, time slot, and urgency. Starting prices are indicative.</p>
      <form onSubmit={apply} className="mt-5 grid gap-3 rounded-3xl border border-line bg-paper p-4 md:grid-cols-3">
        <select className={fieldClass} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {catalog?.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <input className={fieldClass} value={draft.place} placeholder="City, area, or PIN" onChange={(e) => setDraft({ ...draft, place: e.target.value })} aria-label="Place" />
        <input type="date" className={fieldClass} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label="Date" />
        <input className={fieldClass} inputMode="numeric" placeholder="Max budget ₹" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} aria-label="Budget" />
        <select className={fieldClass} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: e.target.value })} aria-label="Minimum rating">
          <option value="">Any rating</option>
          <option value="4">4 and above</option>
          <option value="3">3 and above</option>
        </select>
        <select className={fieldClass} value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value })} aria-label="Time slot">
          <option value="">Any time</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
        <select className={fieldClass} value={draft.urgency} onChange={(e) => setDraft({ ...draft, urgency: e.target.value })} aria-label="Urgency">
          <option value="">Standard urgency</option>
          <option value="same_day">Same day</option>
          <option value="emergency">Emergency</option>
        </select>
        <Button type="submit" className="md:col-span-2">Apply filters</Button>
      </form>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(catalog?.categories ?? []).filter((c) => !search.category || c.slug === search.category).map((c) => (
          <Link key={c.slug} to="/services/$slug" params={{ slug: c.slug }} className="overflow-hidden rounded-3xl border border-line bg-paper">
            <img src={c.image} alt="" className="h-36 w-full object-cover" />
            <div className="p-4">
              <h2 className="text-xl text-navy">{c.name}</h2>
              <p className="mt-1 text-sm text-muted">{c.description}</p>
              <p className="mt-2 text-sm">From {inr(c.startingPriceInr)}</p>
            </div>
          </Link>
        ))}
      </div>
      <h2 className="mt-10 text-3xl text-navy">Professionals {placeLabel ? `· ${placeLabel}` : ""}</h2>
      <p className="mt-1 text-xs text-muted">{note}</p>
      <div className="mt-4 grid gap-4">
        {pros === null ? <div className="h-28 animate-pulse rounded-3xl bg-sand" /> : null}
        {pros?.length === 0 ? <Empty title="No one matched" body="Widen the city, budget, or rating. PIN codes are matched to the city they belong to." /> : null}
        {pros?.map((p) => <ProCard key={p.userId} pro={p} />)}
      </div>
    </main>
  );
}

export function ServiceDetail({ slug }: { slug: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  useEffect(() => {
    getCatalog().then(setCatalog).catch(() => setCatalog(null));
  }, []);
  if (!catalog) return <PageSkeleton />;
  const category = catalog.categories.find((c) => c.slug === slug);
  if (!category) return <main className="mx-auto max-w-3xl px-4 py-12"><Empty title="Service not listed" body="Choose a category from the directory." action={<Link to="/services" search={{ category: "", place: "", date: "", budget: "", rating: "", slot: "", urgency: "" }} className="text-leaf underline">Back to services</Link>} /></main>;
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2">
      <img src={category.image} alt="" className="h-72 w-full rounded-3xl object-cover lg:h-full" />
      <div>
        <div className="flex items-center gap-2 text-leaf"><CategoryIcon slug={category.slug} className="h-5 w-5" /><span className="text-sm">Household service</span></div>
        <h1 className="mt-2 text-4xl text-navy">{category.name}</h1>
        <p className="mt-3 text-muted">{category.description}</p>
        <p className="mt-4 text-sm">Indicative start {inr(category.startingPriceInr)}. The visit estimate adds labour, materials, travel, and fees.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {category.tasks.map((task) => <li key={task} className="flex gap-2"><Clock3 className="mt-0.5 h-4 w-4 text-leaf" />{task}</li>)}
        </ul>
        <Link to="/customer/book" search={{ category: category.slug, provider: "" }} className="mt-6 inline-flex h-11 items-center rounded-full bg-leaf px-5 text-sm text-paper">
          Book this service
        </Link>
      </div>
    </main>
  );
}

export function HowPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <h1 className="text-4xl text-navy">How Homely works</h1>
        <p className="mt-3 text-muted">One booking path for customers, a separate desk for professionals, and an administrator who actually decides verification.</p>
      </header>
      <Section title="Booking">
        Choose a service, add the address and PIN, describe the issue, and pick a date, slot, and urgency. Photos are optional. Homely ranks nearby professionals with a written reason, shows an itemised estimate, then creates a booking id.
      </Section>
      <Section title="Professionals">
        A professional account lists skills, a working radius, rates, and weekly slots. New requests can be accepted or declined. Status moves pending, accepted, in progress, completed — or cancelled — and each change is timestamped.
      </Section>
      <Section title="Estimates">
        Total = labour + materials + travel + urgency + platform fee + indicative GST. If the job differs, the professional proposes a new total. It replaces the agreed price only after you approve it.
      </Section>
      <Section title="Safety">
        Customer phone numbers stay hidden until a request is accepted. Documents are visible to administrators. Trust ignores complaints that have not been upheld. The booking ledger is a hash chain on this server, not a blockchain.
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <section className="rounded-3xl border border-line bg-paper p-6">
      <h2 className="text-2xl text-navy">{title}</h2>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </section>
  );
}

export function BecomePage() {
  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
      <div>
        <h1 className="text-4xl text-navy">Work with households near you.</h1>
        <p className="mt-4 text-muted">List the services you actually do, set a radius and a rate, and accept the visits that fit. Verification is a document review — not an automatic tick.</p>
        <ul className="mt-6 space-y-3 text-sm">
          <li>Set skills, hours, and prices yourself.</li>
          <li>See a short brief before you accept. The full address arrives after.</li>
          <li>Earnings show the platform fee beside each completed visit.</li>
        </ul>
        <Link to="/register" search={{ role: "provider" }} className="mt-6 inline-flex h-11 items-center rounded-full bg-navy px-5 text-sm text-paper">
          Create a professional account
        </Link>
      </div>
      <img src="/media/carpentry.jpg" alt="Fitted teak shelf in a home" className="h-80 w-full rounded-3xl object-cover" />
    </main>
  );
}

export function HelpPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl text-navy">Help</h1>
      <p className="mt-3 text-sm text-muted">The guide on this page answers booking, price, and cancellation questions without calling an outside model. Ask Assistant only if you want a longer answer and you are signed in.</p>
      <div className="mt-6 space-y-3">
        {FAQ.map(([q, a]) => (
          <article key={q} className="rounded-3xl border border-line bg-paper p-5">
            <h2 className="text-xl text-navy">{q}</h2>
            <p className="mt-2 text-sm text-muted">{a}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 text-sm">To report a problem, sign in and use the form on a booking or write from your customer home. Email and SMS are not connected.</p>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm text-muted">
      <h1 className="text-4xl text-navy">Privacy</h1>
      <p>Homely stores your name, email, optional phone, addresses, bookings, messages, and reviews so the service can run. Passwords are hashed by the authentication system. Card numbers are never collected.</p>
      <p>Location is optional. If you allow the browser prompt, coordinates are saved only on the address or search you submitted. You can book with a city and PIN alone.</p>
      <p>Identity documents uploaded for verification are visible to administrators. Do not upload a full Aadhaar number — the form rejects a 12-digit reference. Homely does not run face matching.</p>
      <p>Booking photos stay on that booking and are shown to the professional after they accept. There is no video recording.</p>
      <p>Demo records are labelled and can be replaced. Sample customers are not real people.</p>
      <p>Account data stays while the account is in use. An administrator can suspend a professional profile. This deployment does not yet run a separate retention purge job.</p>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm text-muted">
      <h1 className="text-4xl text-navy">Terms</h1>
      <p>Homely is a booking desk between households and independent professionals. An estimate is not a promise of the final scope. You approve the breakdown before a booking is created, and you approve any later revision.</p>
      <p>Cancellation follows the platform window. The charge, if any, is shown before you confirm and is recorded as pay-on-completion. No payment gateway is connected.</p>
      <p>Reviews can be written only after a visit is marked completed, once per booking. Administrators may hide reviews that are abusive. Hiding a review updates the professional's rating.</p>
      <p>Professionals are responsible for the quality of the work and for holding any licences their trade requires. A verified badge means a document was reviewed, not that Homely guarantees the outcome.</p>
      <p>Do not use the product to store government identity numbers. Demo tools are simulations and are labelled as such.</p>
    </main>
  );
}

export function ProfessionalPreview({ userId }: { userId: string }) {
  const [state, setState] = useState<Awaited<ReturnType<typeof getProfessional>> | null>(null);
  useEffect(() => {
    getProfessional({ data: { userId } }).then(setState).catch(() => setState({ ok: false, error: "That professional is not available." }));
  }, [userId]);
  if (!state) return <PageSkeleton />;
  if (!state.ok) return <Empty title="Profile unavailable" body={state.error} />;
  const p = state.provider;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-4xl text-navy">{p.name}</h1>
        <Verified status={p.verificationStatus} />
        {p.isDemo ? <DemoPill /> : null}
      </div>
      <p className="mt-2 text-sm text-muted">{p.area}, {p.city} · {p.experienceYears} years · {p.qualifications}</p>
      <p className="mt-4">{p.about}</p>
      <p className="mt-4 text-sm">Trust {p.trustScore}/100. {p.trustEarly ? "Early profile — a single review cannot define the score." : "Enough reviews to stand without the prior dominating."} {p.onTimeMeasured ? "Punctuality is measured on Homely." : "Punctuality shown is a stated rate until three tracked visits."}</p>
      <p className="mt-2 text-xs text-muted">{p.trustNote}</p>
      <h2 className="mt-8 text-2xl text-navy">Reviews</h2>
      <div className="mt-3 space-y-3">
        {state.reviews.map((r, i) => (
          <article key={i} className="rounded-2xl border border-line bg-paper p-4 text-sm">
            {r.isDemo ? <DemoPill /> : null} <Stars value={r.rating} />
            <p className="mt-2">{r.body}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
