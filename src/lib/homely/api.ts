import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { CATEGORIES } from "./catalog";
import { CITIES, haversineKm, matchPlace, weekdayFromDate } from "./geo";
import { cancellationQuote, estimatePrice, type PriceEstimate, type RateCard, type TimeSlot, type Urgency } from "./pricing";
import { rankProviders } from "./ranking";
import { TRUST_NOTE, trustScore } from "./trust";

type Sql = Awaited<ReturnType<(typeof import("@/lib/db"))["getSql"]>>;

const SLOTS = ["morning", "afternoon", "evening"] as const;
const URGENCIES = ["standard", "same_day", "emergency"] as const;
const STATUSES = ["pending", "accepted", "in_progress", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const NEXT: Record<Status, Status[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function str(v: unknown, max: number): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}
function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return v == null ? "" : String(v);
}
function day(v: unknown): string {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (v instanceof Date) return v.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return String(v ?? "").slice(0, 10);
}
function asObj<T>(v: unknown): T {
  if (typeof v === "string") return JSON.parse(v) as T;
  return v as T;
}
function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
function bag(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

async function getDb(): Promise<Sql> {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

let seedTask: Promise<void> | null = null;
function ensureSeed(): Promise<void> {
  seedTask ??= runSeed().catch((err) => {
    seedTask = null;
    throw err;
  });
  return seedTask;
}

type DemoPro = {
  id: string;
  name: string;
  city: string;
  area: string;
  pin: string;
  lat: number;
  lng: number;
  years: number;
  skills: string[];
  hourly: number;
  start: number;
  travel: number;
  jobs: number;
  onTime: number;
  verified: "verified" | "pending" | "unverified";
  available: boolean;
  radius: number;
  quals: string;
  about: string;
  evenings: boolean;
};

const DEMOS: DemoPro[] = [
  {
    id: "demo_meera",
    name: "Meera Iyer",
    city: "Bengaluru",
    area: "Koramangala",
    pin: "560034",
    lat: 12.9352,
    lng: 77.6245,
    years: 8,
    skills: ["plumbing", "maintenance"],
    hourly: 380,
    start: 349,
    travel: 12,
    jobs: 126,
    onTime: 0.94,
    verified: "verified",
    available: true,
    radius: 8,
    quals: "ITI plumbing",
    about: "Sample profile. Leak repairs and small fittings across south Bengaluru.",
    evenings: true,
  },
  {
    id: "demo_arjun",
    name: "Arjun Deshmukh",
    city: "Mumbai",
    area: "Andheri West",
    pin: "400053",
    lat: 19.1363,
    lng: 72.8277,
    years: 11,
    skills: ["electrical", "maintenance"],
    hourly: 450,
    start: 399,
    travel: 15,
    jobs: 210,
    onTime: 0.91,
    verified: "verified",
    available: true,
    radius: 10,
    quals: "Licensed electrician",
    about: "Sample profile. Fans, switches, and MCB checks in Andheri and nearby.",
    evenings: false,
  },
  {
    id: "demo_fatima",
    name: "Fatima Qureshi",
    city: "Hyderabad",
    area: "Banjara Hills",
    pin: "500034",
    lat: 17.4156,
    lng: 78.4347,
    years: 6,
    skills: ["cleaning"],
    hourly: 320,
    start: 799,
    travel: 10,
    jobs: 164,
    onTime: 0.96,
    verified: "verified",
    available: true,
    radius: 12,
    quals: "Home cleaning lead",
    about: "Sample profile. Deep cleans for flats, with a fixed visit length.",
    evenings: false,
  },
  {
    id: "demo_karthik",
    name: "Karthik Subramanian",
    city: "Chennai",
    area: "Adyar",
    pin: "600020",
    lat: 13.0012,
    lng: 80.2565,
    years: 9,
    skills: ["ac", "appliance"],
    hourly: 420,
    start: 499,
    travel: 14,
    jobs: 98,
    onTime: 0.88,
    verified: "verified",
    available: true,
    radius: 9,
    quals: "AC and refrigeration technician",
    about: "Sample profile. Split AC service and refrigerator cooling faults.",
    evenings: true,
  },
  {
    id: "demo_neha",
    name: "Neha Kulkarni",
    city: "Pune",
    area: "Kothrud",
    pin: "411038",
    lat: 18.5074,
    lng: 73.8077,
    years: 7,
    skills: ["painting", "carpentry"],
    hourly: 400,
    start: 699,
    travel: 12,
    jobs: 76,
    onTime: 0.9,
    verified: "verified",
    available: false,
    radius: 8,
    quals: "Interior finishing",
    about: "Sample profile. Room touch-ups and small woodwork. Not on call today.",
    evenings: false,
  },
  {
    id: "demo_imran",
    name: "Imran Sheikh",
    city: "Delhi",
    area: "Lajpat Nagar",
    pin: "110024",
    lat: 28.5677,
    lng: 77.2433,
    years: 10,
    skills: ["pest", "maintenance"],
    hourly: 360,
    start: 699,
    travel: 12,
    jobs: 143,
    onTime: 0.92,
    verified: "verified",
    available: true,
    radius: 11,
    quals: "Household pest control",
    about: "Sample profile. Kitchen and general pest visits. No fogging claims beyond the visit.",
    evenings: true,
  },
  {
    id: "demo_lakshmi",
    name: "Lakshmi Natarajan",
    city: "Bengaluru",
    area: "Indiranagar",
    pin: "560038",
    lat: 12.9784,
    lng: 77.6408,
    years: 5,
    skills: ["appliance", "electrical"],
    hourly: 370,
    start: 399,
    travel: 12,
    jobs: 64,
    onTime: 0.93,
    verified: "verified",
    available: true,
    radius: 7,
    quals: "Appliance service",
    about: "Sample profile. Geysers, washing machines, and small electrical faults.",
    evenings: false,
  },
  {
    id: "demo_rohan",
    name: "Rohan Malhotra",
    city: "Mumbai",
    area: "Powai",
    pin: "400076",
    lat: 19.1176,
    lng: 72.906,
    years: 4,
    skills: ["electrical", "carpentry"],
    hourly: 340,
    start: 349,
    travel: 18,
    jobs: 22,
    onTime: 0.86,
    verified: "pending",
    available: true,
    radius: 8,
    quals: "Documents awaiting review",
    about: "Sample profile. Verification is pending, so there is no verified badge.",
    evenings: false,
  },
];

const SAMPLE_REVIEWS = [
  { rating: 5, body: "Sample review. Arrived in the slot and explained the estimate before starting." },
  { rating: 4, body: "Sample review. Work was tidy. The material cost matched what we approved." },
  { rating: 5, body: "Sample review. Clear communication and the visit finished within the time window." },
];

async function runSeed(): Promise<void> {
  const db = await getDb();
  const existing = await db<{ slug: string }>`select slug from service_categories limit 1`;
  if (!existing.length) {
    for (const c of CATEGORIES) {
      await db`insert into service_categories (slug, name, description, tasks, starting_price_inr, image_path, sort_order)
        values (${c.slug}, ${c.name}, ${c.description}, ${JSON.stringify(c.tasks)}::jsonb, ${c.startingPriceInr}, ${c.image}, ${c.sort})
        on conflict (slug) do nothing`;
    }
  }
  const marker = await db`select id from bookings where public_id = ${"HM-SAMPLE-demo_meera-0"} limit 1`;
  if (marker.length) return;

  await db`insert into profiles (user_id, role, full_name, city)
    values ('demo:customer', 'customer', 'Anita Rao (sample customer)', 'Bengaluru')
    on conflict (user_id) do nothing`;

  for (const p of DEMOS) {
    await db`insert into profiles (user_id, role, full_name, city)
      values (${p.id}, 'provider', ${p.name}, ${p.city})
      on conflict (user_id) do nothing`;
    await db`insert into provider_profiles (
        user_id, experience_years, qualifications, service_radius_km, base_city, base_area, pincode,
        lat, lng, starting_price_inr, hourly_rate_inr, travel_per_km_inr, is_demo, verification_status,
        jobs_completed, on_time_rate, about, available_now, rating_sum, review_count
      ) values (
        ${p.id}, ${p.years}, ${p.quals}, ${p.radius}, ${p.city}, ${p.area}, ${p.pin},
        ${p.lat}, ${p.lng}, ${p.start}, ${p.hourly}, ${p.travel}, true, ${p.verified},
        ${p.jobs}, ${p.onTime}, ${p.about}, ${p.available}, 0, 0
      ) on conflict (user_id) do nothing`;
    for (const skill of p.skills) {
      await db`insert into provider_skills (provider_user_id, category_slug) values (${p.id}, ${skill})
        on conflict do nothing`;
    }
    for (let weekday = 0; weekday < 7; weekday += 1) {
      for (const slot of ["morning", "afternoon"] as const) {
        await db`insert into provider_availability (provider_user_id, weekday, slot)
          values (${p.id}, ${weekday}, ${slot}) on conflict do nothing`;
      }
      if (p.evenings && weekday !== 0) {
        await db`insert into provider_availability (provider_user_id, weekday, slot)
          values (${p.id}, ${weekday}, 'evening') on conflict do nothing`;
      }
    }
    let sum = 0;
    SAMPLE_REVIEWS.forEach((review, i) => {
      sum += review.rating;
    });
    for (let i = 0; i < SAMPLE_REVIEWS.length; i += 1) {
      const review = SAMPLE_REVIEWS[i];
      const publicId = `HM-SAMPLE-${p.id}-${i}`;
      const estimate = {
        lines: [{ key: "labour", label: "Labour", amountInr: p.start, note: "Sample history" }],
        totalInr: p.start,
        assumptions: ["Sample booking created for demonstration."],
      };
      const catName = CATEGORIES.find((c) => c.slug === p.skills[0])?.name ?? p.skills[0];
      const inserted = await db<{ id: number }>`insert into bookings (
          public_id, customer_user_id, provider_user_id, category_slug, category_name, status, urgency,
          description, preferred_date, time_slot, address_snapshot, customer_snapshot, provider_snapshot,
          estimate, agreed_total_inr, is_demo_provider, is_demo_customer
        ) values (
          ${publicId}, 'demo:customer', ${p.id}, ${p.skills[0]}, ${catName}, 'completed', 'standard',
          ${"Sample completed visit for demonstration."}, ${"2026-08-12"}, 'morning',
          ${JSON.stringify({ line1: "Sample address hidden", area: p.area, city: p.city, pincode: p.pin })}::jsonb,
          ${JSON.stringify({ name: "Anita Rao (sample customer)", phone: null, demo: true })}::jsonb,
          ${JSON.stringify({ name: p.name, demo: true, city: p.city })}::jsonb,
          ${JSON.stringify(estimate)}::jsonb, ${p.start}, true, true
        ) on conflict (public_id) do nothing returning id`;
      const id = inserted[0]?.id;
      if (!id) continue;
      await db`insert into booking_status_history (booking_id, status, actor_user_id, note)
        values (${id}, 'completed', 'seed', 'Sample history — not a live visit.')`;
      await db`insert into reviews (booking_id, customer_user_id, provider_user_id, rating, body, is_demo)
        values (${id}, 'demo:customer', ${p.id}, ${review.rating}, ${review.body}, true)
        on conflict (booking_id) do nothing`;
      await db`insert into payments (booking_id, amount_inr, status, method, note)
        values (${id}, ${p.start}, 'recorded', 'pay_on_completion', 'Sample ledger row. No card was charged.')`;
    }
    await db`update provider_profiles set rating_sum = ${sum}, review_count = ${SAMPLE_REVIEWS.length}
      where user_id = ${p.id}`;
    await refreshTrust(db, p.id);
  }

  await db`insert into verification_records (
      provider_user_id, doc_type, consent, reference_label, file_name, status
    ) values (
      'demo_rohan', 'Trade certificate', true, 'TC-20418', 'trade-certificate.pdf', 'pending'
    )`;
  await db`insert into complaints (user_id, subject, body, status) values (
      'demo:customer',
      '[Sample] Visit window was missed',
      'Sample complaint so the administrator queue is not empty. It must not change trust unless upheld.',
      'open'
    )`;
}

async function settingsRates(db: Sql, hourly: number, travel: number): Promise<RateCard> {
  const rows = await db<Record<string, unknown>>`select * from platform_settings where id = 1`;
  const s = rows[0] ?? {};
  return {
    hourlyRateInr: hourly,
    travelPerKmInr: travel,
    materialBufferPct: num(s.material_buffer_pct, 10),
    platformFeePct: num(s.platform_fee_pct, 8),
    gstPct: num(s.gst_pct, 18),
    urgencySameDayPct: num(s.urgency_same_day_pct, 15),
    urgencyEmergencyPct: num(s.urgency_emergency_pct, 35),
  };
}

async function refreshTrust(db: Sql, providerId: string): Promise<void> {
  const rows = await db<Record<string, unknown>>`select * from provider_profiles where user_id = ${providerId}`;
  const row = rows[0];
  if (!row) return;
  const reviewCount = num(row.review_count);
  const avg = reviewCount ? num(row.rating_sum) / reviewCount : 0;
  const tracked = num(row.tracked_starts);
  const onTime = tracked >= 3 ? num(row.on_time_starts) / tracked : num(row.on_time_rate, 0.9);
  const jobs = num(row.jobs_completed);
  const cancels = num(row.provider_cancels);
  const completion = jobs + cancels === 0 ? 1 : jobs / (jobs + cancels);
  const trust = trustScore({
    avgRating: avg,
    reviewCount,
    onTimeRate: onTime,
    completionRate: completion,
    upheldComplaints: num(row.complaint_count),
    completedJobs: jobs,
  });
  await db`update provider_profiles set trust_score = ${trust.score}, trust_early = ${trust.early} where user_id = ${providerId}`;
}

async function ledger(db: Sql, bookingId: number | null, eventType: string, payload: unknown): Promise<void> {
  const { createHash } = await import("node:crypto");
  const prev = await db<{ event_hash: string }>`select event_hash from ledger_events order by id desc limit 1`;
  const prevHash = prev[0]?.event_hash ?? "genesis";
  const eventHash = createHash("sha256")
    .update(JSON.stringify({ bookingId, eventType, payload, prevHash }))
    .digest("hex");
  await db`insert into ledger_events (booking_id, event_type, payload, prev_hash, event_hash)
    values (${bookingId}, ${eventType}, ${JSON.stringify(payload)}::jsonb, ${prevHash}, ${eventHash})`;
}

async function notify(db: Sql, userId: string, title: string, body: string, href: string): Promise<void> {
  if (!userId || userId.startsWith("demo")) return;
  await db`insert into notifications (user_id, title, body, href) values (${userId}, ${title}, ${body}, ${href})`;
}

async function audit(db: Sql, actor: string, action: string, target: string, detail: string): Promise<void> {
  await db`insert into audit_logs (actor_user_id, action, target, detail) values (${actor}, ${action}, ${target}, ${detail})`;
}

type Profile = {
  userId: string;
  role: "customer" | "provider" | "admin";
  fullName: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
};

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    userId: String(row.user_id),
    role: row.role as Profile["role"],
    fullName: String(row.full_name),
    phone: row.phone == null ? null : String(row.phone),
    city: row.city == null ? null : String(row.city),
    bio: row.bio == null ? null : String(row.bio),
  };
}

async function loadProfile(db: Sql, userId: string): Promise<Profile | null> {
  const rows = await db<Record<string, unknown>>`select * from profiles where user_id = ${userId}`;
  return rows[0] ? mapProfile(rows[0]) : null;
}

function publicProvider(row: Record<string, unknown>, skills: string[], slots: { weekday: number; slot: string }[]) {
  const reviewCount = num(row.review_count);
  const avg = reviewCount ? Math.round((num(row.rating_sum) / reviewCount) * 10) / 10 : 0;
  const tracked = num(row.tracked_starts);
  return {
    userId: String(row.user_id),
    name: String(row.full_name ?? row.name ?? ""),
    city: String(row.base_city ?? ""),
    area: String(row.base_area ?? ""),
    pincode: String(row.pincode ?? ""),
    lat: row.lat == null ? null : num(row.lat),
    lng: row.lng == null ? null : num(row.lng),
    experienceYears: num(row.experience_years),
    qualifications: String(row.qualifications ?? ""),
    radiusKm: num(row.service_radius_km, 10),
    startingPriceInr: num(row.starting_price_inr),
    hourlyRateInr: num(row.hourly_rate_inr),
    travelPerKmInr: num(row.travel_per_km_inr),
    isDemo: Boolean(row.is_demo),
    verificationStatus: String(row.verification_status),
    trustScore: num(row.trust_score),
    trustEarly: Boolean(row.trust_early),
    trustNote: TRUST_NOTE,
    jobsCompleted: num(row.jobs_completed),
    onTimeRate: tracked >= 3 ? num(row.on_time_starts) / tracked : num(row.on_time_rate),
    onTimeMeasured: tracked >= 3,
    complaintCount: num(row.complaint_count),
    avgRating: avg,
    reviewCount,
    about: String(row.about ?? ""),
    availableNow: Boolean(row.available_now),
    skills,
    slots,
  };
}

async function bundleProviders(db: Sql) {
  const rows = await db<Record<string, unknown>>`
    select pp.*, pr.full_name
    from provider_profiles pp
    join profiles pr on pr.user_id = pp.user_id
    where pp.verification_status <> 'suspended' and pp.verification_status <> 'rejected'`;
  const skillRows = await db<{ provider_user_id: string; category_slug: string }>`
    select provider_user_id, category_slug from provider_skills`;
  const slotRows = await db<{ provider_user_id: string; weekday: number; slot: string }>`
    select provider_user_id, weekday, slot from provider_availability`;
  return rows.map((row) => {
    const id = String(row.user_id);
    return publicProvider(
      row,
      skillRows.filter((s) => s.provider_user_id === id).map((s) => s.category_slug),
      slotRows
        .filter((s) => s.provider_user_id === id)
        .map((s) => ({ weekday: num(s.weekday), slot: String(s.slot) })),
    );
  });
}

type DurationEstimate = {
  minutes: number;
  low: number;
  high: number;
  label: string;
  source: "preliminary" | "sklearn";
};

function arrivalNote(distanceKm: number | null, availableNow: boolean): string {
  if (distanceKm == null) return "Distance is approximate until a city or PIN is set.";
  if (availableNow && distanceKm <= 5) return "Often within about 45 minutes in this area.";
  if (distanceKm <= 10) return "Typically a 1–2 hour arrival once the slot is accepted.";
  return "Plan a scheduled slot — the trip is longer than a neighbourhood visit.";
}

async function maybeModelDuration(
  category: string,
  urgency: string,
  preliminary: DurationEstimate,
): Promise<DurationEstimate> {
  const url = process.env.DURATION_SERVICE_URL;
  if (!url) return preliminary;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category, minutes: preliminary.minutes, urgency }),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return preliminary;
    const body = (await res.json()) as { source?: string; minutes?: number; low?: number; high?: number; label?: string };
    if (body.source !== "sklearn" || !body.minutes) return preliminary;
    return {
      minutes: Math.round(body.minutes),
      low: Math.round(body.low ?? body.minutes),
      high: Math.round(body.high ?? body.minutes),
      label: body.label || "Estimate from the configured duration model.",
      source: "sklearn",
    };
  } catch {
    return preliminary;
  }
}

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeed();
  const db = await getDb();
  const rows = await db<Record<string, unknown>>`
    select * from service_categories order by sort_order`;
  const settings = await db<Record<string, unknown>>`select * from platform_settings where id = 1`;
  const s = settings[0] ?? {};
  return {
    categories: rows.map((r) => ({
      slug: String(r.slug),
      name: String(r.name),
      description: String(r.description),
      tasks: asObj<string[]>(r.tasks),
      startingPriceInr: num(r.starting_price_inr),
      image: String(r.image_path),
      active: Boolean(r.active),
    })),
    settings: {
      platformFeePct: num(s.platform_fee_pct, 8),
      gstPct: num(s.gst_pct, 18),
      urgencySameDayPct: num(s.urgency_same_day_pct, 15),
      urgencyEmergencyPct: num(s.urgency_emergency_pct, 35),
      cancelFreeHours: num(s.cancel_free_hours, 4),
      cancelFeePct: num(s.cancel_fee_pct, 20),
      materialBufferPct: num(s.material_buffer_pct, 10),
    },
    trustNote: TRUST_NOTE,
    cities: CITIES.map((c) => c.name),
  };
});

export const searchProfessionals = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const i = bag(input);
    const urgency = str(i.urgency, 20);
    const slot = str(i.slot, 20);
    return {
      category: str(i.category, 40),
      place: str(i.place, 80),
      date: str(i.date, 10),
      budget: i.budget == null || i.budget === "" ? null : Math.max(0, Math.round(num(i.budget))),
      rating: i.rating == null || i.rating === "" ? null : num(i.rating),
      slot: SLOTS.includes(slot as TimeSlot) ? (slot as TimeSlot) : "",
      urgency: URGENCIES.includes(urgency as Urgency) ? (urgency as Urgency) : "",
      lat: i.lat == null || i.lat === "" ? null : num(i.lat),
      lng: i.lng == null || i.lng === "" ? null : num(i.lng),
    };
  })
  .handler(async ({ data }) => {
    await ensureSeed();
    const db = await getDb();
    const place = matchPlace(data.place);
    const origin =
      data.lat != null && data.lng != null
        ? { lat: data.lat, lng: data.lng, label: place?.label ?? "Your location", city: place?.city ?? "" }
        : place;
    const weekday = data.date ? weekdayFromDate(data.date) : null;
    const all = await bundleProviders(db);
    const filtered = all.filter((p) => {
      if (data.category && !p.skills.includes(data.category)) return false;
      if (origin?.city && p.city.toLowerCase() !== origin.city.toLowerCase()) {
        if (p.lat == null || p.lng == null) return false;
        const d = haversineKm(origin.lat, origin.lng, p.lat, p.lng);
        if (d > p.radiusKm + 3) return false;
      }
      if (data.place && !origin) {
        const q = data.place.toLowerCase();
        const hit =
          p.city.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q) ||
          p.pincode.includes(data.place) ||
          q.includes(p.city.toLowerCase());
        if (!hit) return false;
      }
      if (data.rating != null && data.rating >= 4 && p.reviewCount === 0) return false;
      if (data.rating != null && p.reviewCount > 0 && p.avgRating < data.rating) return false;
      if (data.budget != null && p.startingPriceInr > data.budget && p.hourlyRateInr > data.budget) return false;
      return true;
    });
    const ranked = rankProviders(
      filtered.map((p) => {
        const distanceKm =
          origin && p.lat != null && p.lng != null ? Math.round(haversineKm(origin.lat, origin.lng, p.lat, p.lng) * 10) / 10 : null;
        const slotMatch =
          !data.slot || weekday == null
            ? p.availableNow
            : p.slots.some((s) => s.weekday === weekday && s.slot === data.slot);
        return {
          id: p.userId,
          distanceKm,
          skillMatch: data.category ? p.skills.includes(data.category) : true,
          slotMatch,
          availableNow: p.availableNow,
          startingPriceInr: p.startingPriceInr,
          budgetInr: data.budget,
          avgRating: p.avgRating,
          reviewCount: p.reviewCount,
          trustScore: p.trustScore,
          verified: p.verificationStatus === "verified",
          urgency: data.urgency as Urgency | "",
        };
      }),
    );
    const byId = new Map(ranked.map((r) => [r.id, r]));
    const providers = filtered
      .map((p) => {
        const rank = byId.get(p.userId);
        const distanceKm = rank?.distanceKm ?? null;
        return {
          ...p,
          distanceKm,
          rankScore: rank?.rankScore ?? 0,
          reason: rank?.reason ?? "Suitable professional",
          arrivalNote: arrivalNote(distanceKm, p.availableNow),
        };
      })
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, 24);
    return {
      providers,
      placeLabel: origin?.label ?? (data.place ? `${data.place} (unmatched — showing a wider list)` : "All cities"),
      matched: Boolean(origin),
      note: "Ranking is rule-based: distance, skill, time slot, budget, rating, and trust. It is not a machine-learning model.",
    };
  });

export const getProfessional = createServerFn({ method: "POST" })
  .validator((input: unknown) => ({ userId: str(bag(input).userId, 80) }))
  .handler(async ({ data }) => {
    await ensureSeed();
    const db = await getDb();
    const all = await bundleProviders(db);
    const provider = all.find((p) => p.userId === data.userId);
    if (!provider) return { ok: false as const, error: "That professional is not available." };
    const reviews = await db<Record<string, unknown>>`
      select rating, body, is_demo, created_at from reviews
      where provider_user_id = ${data.userId} and hidden = false
      order by id desc limit 12`;
    return {
      ok: true as const,
      provider,
      reviews: reviews.map((r) => ({
        rating: num(r.rating),
        body: String(r.body),
        isDemo: Boolean(r.is_demo),
        createdAt: iso(r.created_at),
      })),
    };
  });

export const getSessionProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeed();
    const db = await getDb();
    const profile = await loadProfile(db, context.userId);
    const admins = await db<{ n: number }>`select count(*)::int as n from profiles where role = 'admin'`;
    const unread = await db<{ n: number }>`select count(*)::int as n from notifications where user_id = ${context.userId} and read = false`;
    let provider = null as ReturnType<typeof publicProvider> | null;
    if (profile?.role === "provider") {
      const all = await bundleProviders(db);
      provider = all.find((p) => p.userId === context.userId) ?? null;
    }
    return {
      profile,
      provider,
      unread: num(unread[0]?.n),
      adminSeatOpen: num(admins[0]?.n) === 0,
    };
  });

export const saveOnboarding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const role = str(i.role, 20);
    if (role !== "customer" && role !== "provider") throw new Error("Choose customer or professional.");
    const fullName = str(i.fullName, 80);
    if (fullName.length < 2) throw new Error("Enter your name.");
    const phone = str(i.phone, 10);
    if (phone && !/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a 10-digit Indian mobile number, or leave it blank.");
    const city = str(i.city, 40);
    if (!CITIES.some((c) => c.name.toLowerCase() === city.toLowerCase())) {
      throw new Error("Choose a city from the list.");
    }
    return { role: role as "customer" | "provider", fullName, phone, city };
  })
  .handler(async ({ context, data }) => {
    await ensureSeed();
    const db = await getDb();
    const existing = await loadProfile(db, context.userId);
    if (existing) return { ok: true as const, profile: existing, created: false };
    await db`insert into profiles (user_id, role, full_name, phone, city)
      values (${context.userId}, ${data.role}, ${data.fullName}, ${data.phone || null}, ${data.city})`;
    if (data.role === "provider") {
      const city = CITIES.find((c) => c.name.toLowerCase() === data.city.toLowerCase())!;
      await db`insert into provider_profiles (
          user_id, base_city, base_area, lat, lng, about, verification_status, is_demo
        ) values (
          ${context.userId}, ${city.name}, '', ${city.lat}, ${city.lng}, '', 'unverified', false
        )`;
      for (let weekday = 1; weekday <= 6; weekday += 1) {
        await db`insert into provider_availability (provider_user_id, weekday, slot) values (${context.userId}, ${weekday}, 'morning')`;
        await db`insert into provider_availability (provider_user_id, weekday, slot) values (${context.userId}, ${weekday}, 'afternoon')`;
      }
      await seedIncomingDemoRequests(db, context.userId, data.fullName, city.name);
    }
    const profile = await loadProfile(db, context.userId);
    return { ok: true as const, profile, created: true };
  });

async function seedIncomingDemoRequests(db: Sql, providerId: string, name: string, city: string) {
  const count = await db<{ n: number }>`select count(*)::int as n from bookings where provider_user_id = ${providerId}`;
  if (num(count[0]?.n) > 0) return;
  const samples = [
    { slug: "maintenance", name: "General home maintenance", desc: "Sample request: curtain rod is loose and a door is sticking.", slot: "morning" },
    { slug: "plumbing", name: "Plumbing", desc: "Sample request: kitchen tap drips. Demo customer — not a real household.", slot: "afternoon" },
  ];
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const publicId = `HM-INBOX-${providerId.slice(0, 8)}-${i}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const estimate = { lines: [], totalInr: 499, assumptions: ["Sample request seeded so the inbox is not empty."] };
    const inserted = await db<{ id: number }>`insert into bookings (
        public_id, customer_user_id, provider_user_id, category_slug, category_name, status, urgency,
        description, preferred_date, time_slot, address_snapshot, customer_snapshot, provider_snapshot,
        estimate, agreed_total_inr, is_demo_provider, is_demo_customer
      ) values (
        ${publicId}, 'demo:customer', ${providerId}, ${s.slug}, ${s.name}, 'pending', 'standard',
        ${s.desc}, ${todayIST()}, ${s.slot},
        ${JSON.stringify({ line1: "12 Sample Lane", area: "Demo layout", city, pincode: "560001" })}::jsonb,
        ${JSON.stringify({ name: "Anita Rao (sample customer)", phone: "9000000000", demo: true })}::jsonb,
        ${JSON.stringify({ name, demo: false, city })}::jsonb,
        ${JSON.stringify(estimate)}::jsonb, 499, false, true
      ) returning id`;
    if (inserted[0]) {
      await db`insert into booking_status_history (booking_id, status, actor_user_id, note)
        values (${inserted[0].id}, 'pending', 'seed', 'Sample request from a demo customer.')`;
    }
  }
}

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me) return { ok: false as const, error: "Create your profile before claiming the administrator seat." };
    if (me.role === "admin") return { ok: true as const };
    const admins = await db<{ n: number }>`select count(*)::int as n from profiles where role = 'admin'`;
    if (num(admins[0]?.n) > 0) return { ok: false as const, error: "An administrator already exists." };
    await db`update profiles set role = 'admin', updated_at = now() where user_id = ${context.userId}`;
    await audit(db, context.userId, "admin.claim", context.userId, "First administrator seat claimed.");
    return { ok: true as const };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const fullName = str(i.fullName, 80);
    if (fullName.length < 2) throw new Error("Enter your name.");
    const phone = str(i.phone, 10);
    if (phone && !/^[6-9]\d{9}$/.test(phone)) throw new Error("Enter a 10-digit mobile number, or leave it blank.");
    const city = str(i.city, 40);
    const bio = str(i.bio, 400);
    return { fullName, phone, city, bio };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me) return { ok: false as const, error: "Create your profile first." };
    await db`update profiles set full_name = ${data.fullName}, phone = ${data.phone || null}, city = ${data.city || null},
      bio = ${data.bio || null}, updated_at = now() where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const listAddresses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db<Record<string, unknown>>`
      select * from addresses where user_id = ${context.userId} order by is_default desc, id desc`;
    return rows.map(mapAddress);
  });

function mapAddress(r: Record<string, unknown>) {
  return {
    id: num(r.id),
    label: String(r.label),
    line1: String(r.line1),
    area: String(r.area),
    city: String(r.city),
    pincode: String(r.pincode),
    lat: r.lat == null ? null : num(r.lat),
    lng: r.lng == null ? null : num(r.lng),
    isDefault: Boolean(r.is_default),
  };
}

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const line1 = str(i.line1, 160);
    const area = str(i.area, 80);
    const city = str(i.city, 40);
    const pincode = str(i.pincode, 6);
    const label = str(i.label, 40) || "Home";
    if (line1.length < 4 || area.length < 2) throw new Error("Enter the street and locality.");
    if (!/^\d{6}$/.test(pincode)) throw new Error("Enter a 6-digit PIN code.");
    return {
      id: i.id == null ? null : num(i.id),
      label,
      line1,
      area,
      city,
      pincode,
      lat: i.lat == null || i.lat === "" ? null : num(i.lat),
      lng: i.lng == null || i.lng === "" ? null : num(i.lng),
      isDefault: Boolean(i.isDefault),
    };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    if (data.isDefault) {
      await db`update addresses set is_default = false where user_id = ${context.userId}`;
    }
    if (data.id) {
      const updated = await db`update addresses set label = ${data.label}, line1 = ${data.line1}, area = ${data.area},
        city = ${data.city}, pincode = ${data.pincode}, lat = ${data.lat}, lng = ${data.lng}, is_default = ${data.isDefault}
        where id = ${data.id} and user_id = ${context.userId} returning id`;
      if (!updated.length) return { ok: false as const, error: "Address not found." };
      return { ok: true as const };
    }
    await db`insert into addresses (user_id, label, line1, area, city, pincode, lat, lng, is_default)
      values (${context.userId}, ${data.label}, ${data.line1}, ${data.area}, ${data.city}, ${data.pincode}, ${data.lat}, ${data.lng}, ${data.isDefault})`;
    return { ok: true as const };
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(bag(input).id) }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    await db`delete from addresses where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db<Record<string, unknown>>`
      select * from notifications where user_id = ${context.userId} order by id desc limit 30`;
    return rows.map((r) => ({
      id: num(r.id),
      title: String(r.title),
      body: String(r.body),
      href: r.href == null ? null : String(r.href),
      read: Boolean(r.read),
      createdAt: iso(r.created_at),
    }));
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    await db`update notifications set read = true where user_id = ${context.userId} and read = false`;
    return { ok: true as const };
  });

export const toggleFavourite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ providerUserId: str(bag(input).providerUserId, 80) }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me || me.role !== "customer") return { ok: false as const, error: "Favourites are for customer accounts." };
    const existing = await db`select user_id from favourites where user_id = ${context.userId} and provider_user_id = ${data.providerUserId}`;
    if (existing.length) {
      await db`delete from favourites where user_id = ${context.userId} and provider_user_id = ${data.providerUserId}`;
      return { ok: true as const, saved: false };
    }
    await db`insert into favourites (user_id, provider_user_id) values (${context.userId}, ${data.providerUserId})`;
    return { ok: true as const, saved: true };
  });

export const listFavourites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeed();
    const db = await getDb();
    const ids = await db<{ provider_user_id: string }>`
      select provider_user_id from favourites where user_id = ${context.userId} order by created_at desc`;
    const all = await bundleProviders(db);
    const wanted = new Set(ids.map((r) => r.provider_user_id));
    return all.filter((p) => wanted.has(p.userId));
  });

export const previewEstimate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => parseEstimateInput(input))
  .handler(async ({ data }) => {
    await ensureSeed();
    const db = await getDb();
    return buildEstimate(db, data);
  });

function parseEstimateInput(input: unknown) {
  const i = bag(input);
  const urgency = str(i.urgency, 20);
  const slot = str(i.slot, 20);
  if (!URGENCIES.includes(urgency as Urgency)) throw new Error("Choose an urgency.");
  if (!SLOTS.includes(slot as TimeSlot)) throw new Error("Choose a time slot.");
  const date = str(i.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayIST()) throw new Error("Choose today or a future date.");
  return {
    providerUserId: str(i.providerUserId, 80),
    category: str(i.category, 40),
    urgency: urgency as Urgency,
    slot: slot as TimeSlot,
    date,
    place: str(i.place, 80),
    lat: i.lat == null || i.lat === "" ? null : num(i.lat),
    lng: i.lng == null || i.lng === "" ? null : num(i.lng),
  };
}

async function buildEstimate(db: Sql, data: ReturnType<typeof parseEstimateInput>) {
  const rows = await db<Record<string, unknown>>`
    select pp.*, pr.full_name from provider_profiles pp
    join profiles pr on pr.user_id = pp.user_id
    where pp.user_id = ${data.providerUserId}`;
  const row = rows[0];
  if (!row) return { ok: false as const, error: "Professional not found." };
  const skills = await db<{ category_slug: string }>`
    select category_slug from provider_skills where provider_user_id = ${data.providerUserId}`;
  const skillList = skills.map((s) => s.category_slug);
  if (data.category && skillList.length && !skillList.includes(data.category)) {
    return { ok: false as const, error: "That professional does not list this service." };
  }
  const origin = data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : matchPlace(data.place);
  let distance = 6;
  if (origin && row.lat != null && row.lng != null) {
    distance = haversineKm(origin.lat, origin.lng, num(row.lat), num(row.lng));
  }
  const rates = await settingsRates(db, num(row.hourly_rate_inr, 399), num(row.travel_per_km_inr, 12));
  const estimate = estimatePrice({
    categorySlug: data.category,
    urgency: data.urgency,
    distanceKm: distance,
    rates,
  });
  const duration = await maybeModelDuration(data.category, data.urgency, estimate.duration);
  return {
    ok: true as const,
    estimate: { ...estimate, duration },
    distanceKm: Math.round(distance * 10) / 10,
    providerName: String(row.full_name),
  };
}

export const createBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const base = parseEstimateInput(i);
    const description = str(i.description, 800);
    if (description.length < 8) throw new Error("Describe the issue in a sentence or two.");
    const line1 = str(i.line1, 160);
    const area = str(i.area, 80);
    const city = str(i.city, 40);
    const pincode = str(i.pincode, 6);
    if (line1.length < 4 || area.length < 2) throw new Error("Enter the street and locality.");
    if (!/^\d{6}$/.test(pincode)) throw new Error("Enter a 6-digit PIN code.");
    const images = Array.isArray(i.images) ? i.images.slice(0, 3) : [];
    const cleanImages: string[] = [];
    for (const image of images) {
      const dataUrl = str(bag(image).dataUrl, 400_000);
      if (!dataUrl) continue;
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) {
        throw new Error("Photos must be JPG, PNG, or WebP.");
      }
      if (dataUrl.length > 380_000) throw new Error("Each photo must be under about 250 KB.");
      cleanImages.push(dataUrl);
    }
    return { ...base, description, line1, area, city, pincode, images: cleanImages, saveAddress: Boolean(i.saveAddress) };
  })
  .handler(async ({ context, data }) => {
    await ensureSeed();
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me || me.role !== "customer") return { ok: false as const, error: "Only a customer account can book." };
    const built = await buildEstimate(db, data);
    if (!built.ok) return built;
    const provider = await db<Record<string, unknown>>`
      select is_demo, verification_status, base_city from provider_profiles where user_id = ${data.providerUserId}`;
    if (!provider[0] || provider[0].verification_status === "suspended") {
      return { ok: false as const, error: "That professional cannot take bookings." };
    }
    if (data.saveAddress) {
      await db`insert into addresses (user_id, label, line1, area, city, pincode, lat, lng, is_default)
        values (${context.userId}, 'Home', ${data.line1}, ${data.area}, ${data.city}, ${data.pincode}, ${data.lat}, ${data.lng}, false)`;
    }
    const publicId = await uniquePublicId(db);
    const cat = CATEGORIES.find((c) => c.slug === data.category);
    const address = { line1: data.line1, area: data.area, city: data.city, pincode: data.pincode, lat: data.lat, lng: data.lng };
    const customerSnap = { name: me.fullName, phone: me.phone, demo: false };
    const providerSnap = {
      name: built.providerName,
      demo: Boolean(provider[0].is_demo),
      city: String(provider[0].base_city ?? ""),
      userId: data.providerUserId,
    };
    const inserted = await db<{ id: number }>`insert into bookings (
        public_id, customer_user_id, provider_user_id, category_slug, category_name, status, urgency,
        description, preferred_date, time_slot, address_snapshot, customer_snapshot, provider_snapshot,
        estimate, agreed_total_inr, is_demo_provider, is_demo_customer
      ) values (
        ${publicId}, ${context.userId}, ${data.providerUserId}, ${data.category}, ${cat?.name ?? data.category},
        'pending', ${data.urgency}, ${data.description}, ${data.date}, ${data.slot},
        ${JSON.stringify(address)}::jsonb, ${JSON.stringify(customerSnap)}::jsonb, ${JSON.stringify(providerSnap)}::jsonb,
        ${JSON.stringify(built.estimate)}::jsonb, ${built.estimate.totalInr}, ${Boolean(provider[0].is_demo)}, false
      ) returning id`;
    const id = inserted[0].id;
    await db`insert into booking_status_history (booking_id, status, actor_user_id, note)
      values (${id}, 'pending', ${context.userId}, 'Booking created.')`;
    for (const dataUrl of data.images) {
      await db`insert into booking_images (booking_id, data_url) values (${id}, ${dataUrl})`;
    }
    await db`insert into payments (booking_id, amount_inr, status, method, note)
      values (${id}, ${built.estimate.totalInr}, 'due_on_completion', 'pay_on_completion', 'No card captured.')`;
    await ledger(db, id, "booking.created", { publicId, total: built.estimate.totalInr });
    await notify(db, data.providerUserId, "New booking request", `${cat?.name ?? "A job"} · ${publicId}`, `/provider/requests`);
    await notify(db, context.userId, "Request sent", `${publicId} is pending with ${built.providerName}.`, `/customer/bookings/${id}`);
    return { ok: true as const, id, publicId };
  });

async function uniquePublicId(db: Sql): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let n = 0; n < 5; n += 1) {
    const bytes = randomBytes(6);
    const id = `HM-${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
    const hit = await db`select id from bookings where public_id = ${id}`;
    if (!hit.length) return id;
  }
  throw new Error("Could not allocate a booking id. Try again.");
}

function mapBookingList(r: Record<string, unknown>) {
  return {
    id: num(r.id),
    publicId: String(r.public_id),
    status: String(r.status) as Status,
    categoryName: String(r.category_name),
    categorySlug: String(r.category_slug),
    urgency: String(r.urgency),
    preferredDate: day(r.preferred_date),
    timeSlot: String(r.time_slot),
    agreedTotalInr: num(r.agreed_total_inr),
    providerName: asObj<{ name?: string }>(r.provider_snapshot).name ?? "Professional",
    customerName: asObj<{ name?: string }>(r.customer_snapshot).name ?? "Customer",
    isDemoProvider: Boolean(r.is_demo_provider),
    isDemoCustomer: Boolean(r.is_demo_customer),
    area: asObj<{ area?: string; city?: string }>(r.address_snapshot).area ?? "",
    city: asObj<{ city?: string }>(r.address_snapshot).city ?? "",
    createdAt: iso(r.created_at),
  };
}

export const listCustomerBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db<Record<string, unknown>>`
      select * from bookings where customer_user_id = ${context.userId} order by id desc`;
    return rows.map(mapBookingList);
  });

export const listProviderBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me || me.role !== "provider") return [];
    const rows = await db<Record<string, unknown>>`
      select * from bookings where provider_user_id = ${context.userId} order by id desc`;
    return rows.map(mapBookingList);
  });

export const getBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(bag(input).id) }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const rows = await db<Record<string, unknown>>`select * from bookings where id = ${data.id}`;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Booking not found." };
    const me = await loadProfile(db, context.userId);
    if (!me) return { ok: false as const, error: "Create your profile first." };
    const isCustomer = String(row.customer_user_id) === context.userId;
    const isProvider = String(row.provider_user_id) === context.userId;
    const isAdmin = me.role === "admin";
    if (!isCustomer && !isProvider && !isAdmin) return { ok: false as const, error: "You cannot view this booking." };
    const status = String(row.status) as Status;
    const reveal = isAdmin || isCustomer || (isProvider && status !== "pending");
    const address = asObj<{ line1?: string; area?: string; city?: string; pincode?: string }>(row.address_snapshot);
    const customer = asObj<{ name?: string; demo?: boolean; phone?: string | null }>(row.customer_snapshot);
    const provider = asObj<{ name?: string; demo?: boolean; city?: string }>(row.provider_snapshot);
    const history = await db<Record<string, unknown>>`
      select status, note, created_at, actor_user_id from booking_status_history where booking_id = ${data.id} order by id`;
    const messages = await db<Record<string, unknown>>`
      select id, sender_user_id, body, created_at from booking_messages where booking_id = ${data.id} order by id`;
    const images = reveal || isCustomer
      ? await db<{ data_url: string }>`select data_url from booking_images where booking_id = ${data.id} order by id`
      : [];
    const review = await db<Record<string, unknown>>`
      select rating, body, is_demo, hidden from reviews where booking_id = ${data.id}`;
    const ledgerRows = isAdmin
      ? await db<Record<string, unknown>>`select id, event_type, prev_hash, event_hash, created_at from ledger_events where booking_id = ${data.id} order by id`
      : [];
    const settings = await db<Record<string, unknown>>`select * from platform_settings where id = 1`;
    let providerPhone: string | null = null;
    if (isCustomer && !row.is_demo_provider && ["accepted", "in_progress", "completed"].includes(status)) {
      const phoneRows = await db<{ phone: string | null }>`select phone from profiles where user_id = ${String(row.provider_user_id)}`;
      providerPhone = phoneRows[0]?.phone ?? null;
    }
    const cancel =
      isCustomer && (status === "pending" || status === "accepted")
        ? cancellationQuote({
            agreedTotalInr: num(row.agreed_total_inr),
            appointmentDate: day(row.preferred_date),
            slot: String(row.time_slot) as TimeSlot,
            now: new Date(),
            freeHours: num(settings[0]?.cancel_free_hours, 4),
            feePct: num(settings[0]?.cancel_fee_pct, 20),
          })
        : null;
    return {
      ok: true as const,
      role: isAdmin ? "admin" : isProvider ? "provider" : "customer",
      booking: {
        id: num(row.id),
        publicId: String(row.public_id),
        status,
        categoryName: String(row.category_name),
        categorySlug: String(row.category_slug),
        urgency: String(row.urgency),
        description: reveal || isCustomer ? String(row.description) : `${String(row.description).slice(0, 120)}…`,
        preferredDate: day(row.preferred_date),
        timeSlot: String(row.time_slot),
        agreedTotalInr: num(row.agreed_total_inr),
        estimate: asObj<PriceEstimate>(row.estimate),
        revisedEstimate: row.revised_estimate ? asObj<PriceEstimate>(row.revised_estimate) : null,
        revisionStatus: row.revision_status == null ? null : String(row.revision_status),
        customerConfirmed: Boolean(row.customer_confirmed),
        isDemoProvider: Boolean(row.is_demo_provider),
        isDemoCustomer: Boolean(row.is_demo_customer),
        cancelReason: row.cancel_reason == null ? null : String(row.cancel_reason),
        address: reveal
          ? address
          : { area: address.area, city: address.city, pincode: address.pincode, line1: "Shared after you accept" },
        customer: {
          name: customer.name,
          demo: Boolean(customer.demo),
          phone: reveal ? customer.phone ?? null : null,
        },
        provider: {
          name: provider.name,
          demo: Boolean(provider.demo),
          city: provider.city,
          userId: String(row.provider_user_id),
          phone: providerPhone,
          phoneNote: row.is_demo_provider
            ? "Demo profile — no real phone number."
            : status === "pending"
              ? "Phone is shared after the professional accepts."
              : null,
        },
        createdAt: iso(row.created_at),
      },
      history: history.map((h) => ({
        status: String(h.status),
        note: h.note == null ? "" : String(h.note),
        at: iso(h.created_at),
      })),
      messages: messages.map((m) => ({
        id: num(m.id),
        mine: String(m.sender_user_id) === context.userId,
        body: String(m.body),
        at: iso(m.created_at),
      })),
      images: images.map((img) => img.data_url),
      review: review[0]
        ? { rating: num(review[0].rating), body: String(review[0].body), isDemo: Boolean(review[0].is_demo), hidden: Boolean(review[0].hidden) }
        : null,
      cancel,
      ledger: ledgerRows.map((e) => ({
        id: num(e.id),
        type: String(e.event_type),
        hash: String(e.event_hash),
        prev: String(e.prev_hash),
        at: iso(e.created_at),
      })),
    };
  });

async function loadOwnedBooking(db: Sql, id: number) {
  const rows = await db<Record<string, unknown>>`select * from bookings where id = ${id}`;
  return rows[0] ?? null;
}

async function applyStatus(db: Sql, row: Record<string, unknown>, next: Status, actor: string, note: string) {
  const current = String(row.status) as Status;
  if (!NEXT[current].includes(next)) {
    return { ok: false as const, error: `Cannot move a ${current.replaceAll("_", " ")} booking to ${next.replaceAll("_", " ")}.` };
  }
  await db`update bookings set status = ${next}, updated_at = now(), cancel_reason = ${next === "cancelled" ? note : row.cancel_reason ?? null}
    where id = ${num(row.id)}`;
  await db`insert into booking_status_history (booking_id, status, actor_user_id, note)
    values (${num(row.id)}, ${next}, ${actor}, ${note})`;
  await ledger(db, num(row.id), `status.${next}`, { note });
  const providerId = String(row.provider_user_id);
  const customerId = String(row.customer_user_id);
  if (next === "in_progress") {
    const onTime = day(row.preferred_date) === todayIST();
    await db`update provider_profiles set tracked_starts = tracked_starts + 1,
      on_time_starts = on_time_starts + ${onTime ? 1 : 0} where user_id = ${providerId}`;
    const fresh = await db<Record<string, unknown>>`select tracked_starts, on_time_starts from provider_profiles where user_id = ${providerId}`;
    if (num(fresh[0]?.tracked_starts) >= 3) {
      const rate = num(fresh[0]?.on_time_starts) / num(fresh[0]?.tracked_starts);
      await db`update provider_profiles set on_time_rate = ${rate} where user_id = ${providerId}`;
    }
    await refreshTrust(db, providerId);
  }
  if (next === "completed") {
    await db`update provider_profiles set jobs_completed = jobs_completed + 1 where user_id = ${providerId}`;
    await db`update payments set status = 'recorded', amount_inr = ${num(row.agreed_total_inr)},
      note = 'Marked recorded on completion. No card was charged.' where booking_id = ${num(row.id)}`;
    await refreshTrust(db, providerId);
  }
  if (next === "cancelled" && actor === providerId) {
    await db`update provider_profiles set provider_cancels = provider_cancels + 1 where user_id = ${providerId}`;
    await refreshTrust(db, providerId);
  }
  const hrefC = `/customer/bookings/${num(row.id)}`;
  const hrefP = `/provider/bookings`;
  await notify(db, customerId, `Booking ${next.replaceAll("_", " ")}`, `${row.public_id}: ${note}`, hrefC);
  await notify(db, providerId, `Booking ${next.replaceAll("_", " ")}`, `${row.public_id}: ${note}`, hrefP);
  return { ok: true as const };
}

export const setBookingStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const status = str(i.status, 20);
    if (!STATUSES.includes(status as Status)) throw new Error("Unknown status.");
    return { id: num(i.id), status: status as Status, note: str(i.note, 240) };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me || me.role !== "provider") return { ok: false as const, error: "Only the assigned professional can update status." };
    const row = await loadOwnedBooking(db, data.id);
    if (!row || String(row.provider_user_id) !== context.userId) return { ok: false as const, error: "Booking not found." };
    const note = data.note || (data.status === "cancelled" ? "Declined by the professional." : `Marked ${data.status.replaceAll("_", " ")}.`);
    return applyStatus(db, row, data.status, context.userId, note);
  });

export const stepDemoBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(bag(input).id) }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const row = await loadOwnedBooking(db, data.id);
    if (!row || String(row.customer_user_id) !== context.userId) return { ok: false as const, error: "Booking not found." };
    if (!row.is_demo_provider) return { ok: false as const, error: "Only a labelled demo professional can be stepped this way." };
    const current = String(row.status) as Status;
    const next = NEXT[current].find((s) => s !== "cancelled");
    if (!next) return { ok: false as const, error: "This demo visit has no further step." };
    return applyStatus(
      db,
      row,
      next,
      context.userId,
      "Demo professional stepped forward on request. This is a simulation, not a live visit.",
    );
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(bag(input).id), reason: str(bag(input).reason, 240) }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const row = await loadOwnedBooking(db, data.id);
    if (!row || String(row.customer_user_id) !== context.userId) return { ok: false as const, error: "Booking not found." };
    const status = String(row.status) as Status;
    if (status !== "pending" && status !== "accepted") {
      return { ok: false as const, error: "This visit can no longer be cancelled online." };
    }
    const settings = await db<Record<string, unknown>>`select * from platform_settings where id = 1`;
    const quote = cancellationQuote({
      agreedTotalInr: num(row.agreed_total_inr),
      appointmentDate: day(row.preferred_date),
      slot: String(row.time_slot) as TimeSlot,
      now: new Date(),
      freeHours: num(settings[0]?.cancel_free_hours, 4),
      feePct: num(settings[0]?.cancel_fee_pct, 20),
    });
    const result = await applyStatus(db, row, "cancelled", context.userId, data.reason || "Cancelled by customer.");
    if (result.ok) {
      await db`insert into payments (booking_id, amount_inr, status, method, note)
        values (${data.id}, ${quote.feeInr}, 'cancellation_recorded', 'pay_on_completion', ${quote.detail})`;
      await ledger(db, data.id, "booking.cancelled", { feeInr: quote.feeInr, free: quote.free });
    }
    return result.ok ? { ok: true as const, feeInr: quote.feeInr, detail: quote.detail } : result;
  });

export const rescheduleBooking = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const date = str(i.date, 10);
    const slot = str(i.slot, 20);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayIST()) throw new Error("Choose today or a future date.");
    if (!SLOTS.includes(slot as TimeSlot)) throw new Error("Choose a time slot.");
    return { id: num(i.id), date, slot: slot as TimeSlot };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const row = await loadOwnedBooking(db, data.id);
    if (!row || String(row.customer_user_id) !== context.userId) return { ok: false as const, error: "Booking not found." };
    const status = String(row.status);
    if (status !== "pending" && status !== "accepted") {
      return { ok: false as const, error: "Reschedule is available only before the visit starts." };
    }
    await db`update bookings set preferred_date = ${data.date}, time_slot = ${data.slot}, updated_at = now() where id = ${data.id}`;
    await db`insert into booking_status_history (booking_id, status, actor_user_id, note)
      values (${data.id}, ${status}, ${context.userId}, ${`Rescheduled to ${data.date} · ${data.slot}.`})`;
    await ledger(db, data.id, "booking.rescheduled", { date: data.date, slot: data.slot });
    await notify(db, String(row.provider_user_id), "Visit rescheduled", `${row.public_id} moved to ${data.date}.`, "/provider/bookings");
    return { ok: true as const };
  });

export const proposeRevision = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const labour = Math.max(0, Math.round(num(i.labour)));
    const materials = Math.max(0, Math.round(num(i.materials)));
    const travel = Math.max(0, Math.round(num(i.travel)));
    const note = str(i.note, 300);
    if (!note) throw new Error("Explain what changed on the job.");
    return { id: num(i.id), labour, materials, travel, note };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    const row = await loadOwnedBooking(db, data.id);
    if (!me || me.role !== "provider" || !row || String(row.provider_user_id) !== context.userId) {
      return { ok: false as const, error: "You cannot revise this booking." };
    }
    if (row.status !== "accepted" && row.status !== "in_progress") {
      return { ok: false as const, error: "Revisions are allowed after the request is accepted." };
    }
    if (row.revision_status === "pending_customer") return { ok: false as const, error: "A revision is already waiting for the customer." };
    const provider = await db<Record<string, unknown>>`select hourly_rate_inr, travel_per_km_inr from provider_profiles where user_id = ${context.userId}`;
    const rates = await settingsRates(db, num(provider[0]?.hourly_rate_inr, 399), num(provider[0]?.travel_per_km_inr, 12));
    const urgencyCharge = 0;
    const subtotal = data.labour + data.materials + data.travel + urgencyCharge;
    const platform = Math.round(subtotal * (rates.platformFeePct / 100));
    const tax = Math.round((subtotal + platform) * (rates.gstPct / 100));
    const revised = {
      lines: [
        { key: "labour", label: "Labour", amountInr: data.labour, note: "Revised by the professional" },
        { key: "materials", label: "Materials", amountInr: data.materials, note: data.note },
        { key: "travel", label: "Travel", amountInr: data.travel, note: "Revised" },
        { key: "platform", label: "Platform fee", amountInr: platform, note: `${rates.platformFeePct}%` },
        { key: "tax", label: "GST (indicative)", amountInr: tax, note: `${rates.gstPct}%` },
      ],
      totalInr: subtotal + platform + tax,
      note: data.note,
      assumptions: ["Applies only if the customer approves."],
    };
    await db`update bookings set revised_estimate = ${JSON.stringify(revised)}::jsonb, revision_status = 'pending_customer', updated_at = now()
      where id = ${data.id}`;
    await ledger(db, data.id, "price.proposed", { total: revised.totalInr });
    await notify(db, String(row.customer_user_id), "Price revision to approve", `${row.public_id}: ${data.note}`, `/customer/bookings/${data.id}`);
    return { ok: true as const, totalInr: revised.totalInr };
  });

export const decideRevision = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(bag(input).id), approve: Boolean(bag(input).approve) }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const row = await loadOwnedBooking(db, data.id);
    if (!row || String(row.customer_user_id) !== context.userId) return { ok: false as const, error: "Booking not found." };
    if (row.revision_status !== "pending_customer" || !row.revised_estimate) {
      return { ok: false as const, error: "Nothing is waiting for approval." };
    }
    if (!data.approve) {
      await db`update bookings set revision_status = 'rejected', updated_at = now() where id = ${data.id}`;
      await ledger(db, data.id, "price.rejected", {});
      await notify(db, String(row.provider_user_id), "Revision declined", `${row.public_id} stays at the original estimate.`, "/provider/bookings");
      return { ok: true as const };
    }
    const revised = asObj<{ totalInr: number }>(row.revised_estimate);
    await db`update bookings set estimate = revised_estimate, agreed_total_inr = ${num(revised.totalInr)},
      revision_status = 'approved', updated_at = now() where id = ${data.id}`;
    await db`update payments set amount_inr = ${num(revised.totalInr)} where booking_id = ${data.id} and status = 'due_on_completion'`;
    await ledger(db, data.id, "price.approved", { total: num(revised.totalInr) });
    await notify(db, String(row.provider_user_id), "Revision approved", `${row.public_id} updated.`, "/provider/bookings");
    return { ok: true as const };
  });

export const confirmAndReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const ratingRaw = bag(input).rating;
    const rating = ratingRaw == null || ratingRaw === "" ? 0 : Math.round(num(ratingRaw));
    const body = str(bag(input).body, 600);
    const confirm = Boolean(bag(input).confirm);
    if (rating && (rating < 1 || rating > 5 || body.length < 4)) {
      throw new Error("Choose a rating from 1 to 5 and write a short review.");
    }
    if (!confirm && !rating) throw new Error("Confirm the visit or leave a review.");
    return { id: num(bag(input).id), rating, body, confirm };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const row = await loadOwnedBooking(db, data.id);
    if (!row || String(row.customer_user_id) !== context.userId) return { ok: false as const, error: "Booking not found." };
    if (row.status !== "completed") return { ok: false as const, error: "Reviews open only after the visit is completed." };
    if (data.confirm) {
      await db`update bookings set customer_confirmed = true, updated_at = now() where id = ${data.id}`;
    }
    if (data.rating) {
      const existing = await db`select id from reviews where booking_id = ${data.id}`;
      if (existing.length) return { ok: false as const, error: "A review is already on this booking." };
      await db`insert into reviews (booking_id, customer_user_id, provider_user_id, rating, body, is_demo)
        values (${data.id}, ${context.userId}, ${String(row.provider_user_id)}, ${data.rating}, ${data.body}, false)`;
      await db`update provider_profiles set rating_sum = rating_sum + ${data.rating}, review_count = review_count + 1
        where user_id = ${String(row.provider_user_id)}`;
      await refreshTrust(db, String(row.provider_user_id));
      await ledger(db, data.id, "review.created", { rating: data.rating });
    }
    return { ok: true as const };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const body = str(bag(input).body, 500);
    if (body.length < 1) throw new Error("Write a message.");
    return { id: num(bag(input).id), body };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const row = await loadOwnedBooking(db, data.id);
    if (!row) return { ok: false as const, error: "Booking not found." };
    const party = String(row.customer_user_id) === context.userId || String(row.provider_user_id) === context.userId;
    if (!party) return { ok: false as const, error: "You cannot message on this booking." };
    await db`insert into booking_messages (booking_id, sender_user_id, body) values (${data.id}, ${context.userId}, ${data.body})`;
    const other = String(row.customer_user_id) === context.userId ? String(row.provider_user_id) : String(row.customer_user_id);
    const href = String(row.customer_user_id) === context.userId ? "/provider/bookings" : `/customer/bookings/${data.id}`;
    await notify(db, other, "New message", data.body, href);
    return { ok: true as const };
  });

export const fileComplaint = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const subject = str(i.subject, 120);
    const body = str(i.body, 1000);
    if (subject.length < 4 || body.length < 8) throw new Error("Add a subject and a short description.");
    return { subject, body, bookingId: i.bookingId == null || i.bookingId === "" ? null : num(i.bookingId) };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    if (data.bookingId) {
      const row = await loadOwnedBooking(db, data.bookingId);
      const party = row && (String(row.customer_user_id) === context.userId || String(row.provider_user_id) === context.userId);
      if (!party) return { ok: false as const, error: "That booking is not yours." };
    }
    await db`insert into complaints (user_id, booking_id, subject, body) values (${context.userId}, ${data.bookingId}, ${data.subject}, ${data.body})`;
    return { ok: true as const };
  });

export const listReminders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db<Record<string, unknown>>`
      select * from maintenance_reminders where user_id = ${context.userId} order by due_on`;
    return rows.map((r) => ({
      id: num(r.id),
      title: String(r.title),
      categorySlug: r.category_slug == null ? null : String(r.category_slug),
      dueOn: day(r.due_on),
      notes: r.notes == null ? "" : String(r.notes),
    }));
  });

export const saveReminder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const title = str(i.title, 80);
    const dueOn = str(i.dueOn, 10);
    if (title.length < 3) throw new Error("Name the reminder.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) throw new Error("Choose a date.");
    return { title, dueOn, categorySlug: str(i.categorySlug, 40) || null, notes: str(i.notes, 240) };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me || me.role !== "customer") return { ok: false as const, error: "Reminders are saved on customer accounts." };
    await db`insert into maintenance_reminders (user_id, title, category_slug, due_on, notes)
      values (${context.userId}, ${data.title}, ${data.categorySlug}, ${data.dueOn}, ${data.notes})`;
    return { ok: true as const };
  });

export const deleteReminder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(bag(input).id) }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    await db`delete from maintenance_reminders where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const saveProviderProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const skills = Array.isArray(i.skills) ? i.skills.map((s) => str(s, 40)).filter((s) => CATEGORIES.some((c) => c.slug === s)) : [];
    if (!skills.length) throw new Error("Pick at least one service.");
    const slotsIn = Array.isArray(i.slots) ? i.slots : [];
    const slots = slotsIn
      .map((s) => {
        const b = bag(s);
        return { weekday: num(b.weekday), slot: str(b.slot, 20) };
      })
      .filter((s) => s.weekday >= 0 && s.weekday <= 6 && SLOTS.includes(s.slot as TimeSlot));
    const city = str(i.city, 40);
    if (!CITIES.some((c) => c.name.toLowerCase() === city.toLowerCase())) throw new Error("Choose a city.");
    const pincode = str(i.pincode, 6);
    if (pincode && !/^\d{6}$/.test(pincode)) throw new Error("PIN code must be 6 digits.");
    const hourly = Math.round(num(i.hourlyRateInr));
    if (hourly < 100 || hourly > 5000) throw new Error("Hourly rate should be between ₹100 and ₹5,000.");
    return {
      skills,
      slots,
      city,
      area: str(i.area, 80),
      pincode,
      experienceYears: Math.max(0, Math.min(60, Math.round(num(i.experienceYears)))),
      qualifications: str(i.qualifications, 160),
      about: str(i.about, 500),
      radiusKm: Math.max(2, Math.min(40, Math.round(num(i.radiusKm, 8)))),
      hourly,
      travelPerKmInr: Math.max(0, Math.min(80, Math.round(num(i.travelPerKmInr, 12)))),
      startingPriceInr: Math.max(100, Math.round(num(i.startingPriceInr, hourly))),
      availableNow: Boolean(i.availableNow),
      lat: i.lat == null || i.lat === "" ? null : num(i.lat),
      lng: i.lng == null || i.lng === "" ? null : num(i.lng),
    };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me || me.role !== "provider") return { ok: false as const, error: "This form is for professional accounts." };
    const city = CITIES.find((c) => c.name.toLowerCase() === data.city.toLowerCase())!;
    const lat = data.lat ?? city.lat;
    const lng = data.lng ?? city.lng;
    await db`update provider_profiles set experience_years = ${data.experienceYears}, qualifications = ${data.qualifications},
      service_radius_km = ${data.radiusKm}, base_city = ${city.name}, base_area = ${data.area}, pincode = ${data.pincode},
      lat = ${lat}, lng = ${lng}, starting_price_inr = ${data.startingPriceInr}, hourly_rate_inr = ${data.hourly},
      travel_per_km_inr = ${data.travelPerKmInr}, about = ${data.about}, available_now = ${data.availableNow}
      where user_id = ${context.userId}`;
    await db`update profiles set city = ${city.name}, updated_at = now() where user_id = ${context.userId}`;
    await db`delete from provider_skills where provider_user_id = ${context.userId}`;
    for (const skill of data.skills) {
      await db`insert into provider_skills (provider_user_id, category_slug) values (${context.userId}, ${skill})`;
    }
    await db`delete from provider_availability where provider_user_id = ${context.userId}`;
    for (const slot of data.slots) {
      await db`insert into provider_availability (provider_user_id, weekday, slot) values (${context.userId}, ${slot.weekday}, ${slot.slot})
        on conflict do nothing`;
    }
    return { ok: true as const };
  });

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    if (!i.consent) throw new Error("Consent is required before a document is stored.");
    const docType = str(i.docType, 60);
    if (!["Trade certificate", "Address proof", "GST certificate"].includes(docType)) {
      throw new Error("Choose a document type. Do not upload Aadhaar.");
    }
    const reference = str(i.referenceLabel, 40);
    if (/\d{12}/.test(reference.replace(/\s/g, ""))) {
      throw new Error("That looks like a full Aadhaar number. Homely does not accept it.");
    }
    const fileName = str(i.fileName, 80);
    const fileData = str(i.fileData, 400_000);
    if (fileData && !/^data:image\/(jpeg|png|webp);base64,/.test(fileData)) {
      throw new Error("Upload a JPG, PNG, or WebP, or send the file name only.");
    }
    return { docType, reference, fileName, fileData: fileData || null };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me || me.role !== "provider") return { ok: false as const, error: "Only professionals submit documents." };
    await db`insert into verification_records (provider_user_id, doc_type, consent, reference_label, file_name, file_data, status)
      values (${context.userId}, ${data.docType}, true, ${data.reference}, ${data.fileName}, ${data.fileData}, 'pending')`;
    await db`update provider_profiles set verification_status = 'pending' where user_id = ${context.userId} and verification_status in ('unverified', 'rejected')`;
    return { ok: true as const };
  });

export const providerEarnings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    const me = await loadProfile(db, context.userId);
    if (!me || me.role !== "provider") return { ok: false as const, error: "Not a professional account." };
    const rows = await db<Record<string, unknown>>`
      select public_id, category_name, agreed_total_inr, estimate, status, preferred_date
      from bookings where provider_user_id = ${context.userId} and status = 'completed' order by id desc`;
    const jobs = rows.map((r) => {
      const estimate = asObj<{ lines?: { key: string; amountInr: number }[] }>(r.estimate);
      const fee = estimate.lines?.find((l) => l.key === "platform")?.amountInr ?? 0;
      return {
        publicId: String(r.public_id),
        categoryName: String(r.category_name),
        totalInr: num(r.agreed_total_inr),
        platformFeeInr: num(fee),
        netInr: num(r.agreed_total_inr) - num(fee),
        date: day(r.preferred_date),
      };
    });
    return {
      ok: true as const,
      jobs,
      grossInr: jobs.reduce((s, j) => s + j.totalInr, 0),
      feeInr: jobs.reduce((s, j) => s + j.platformFeeInr, 0),
    };
  });

async function requireAdmin(db: Sql, userId: string) {
  const me = await loadProfile(db, userId);
  if (!me || me.role !== "admin") return null;
  return me;
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeed();
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const people = await db<{ role: string; n: number }>`select role, count(*)::int as n from profiles group by role`;
    const bookings = await db<{ status: string; n: number; gross: number }>`
      select status, count(*)::int as n, coalesce(sum(agreed_total_inr), 0)::int as gross from bookings group by status`;
    const pendingV = await db<{ n: number }>`select count(*)::int as n from verification_records where status = 'pending'`;
    const openC = await db<{ n: number }>`select count(*)::int as n from complaints where status in ('open', 'reviewing')`;
    const completed = await db<Record<string, unknown>>`select estimate from bookings where status = 'completed'`;
    let platformFees = 0;
    for (const row of completed) {
      const estimate = asObj<{ lines?: { key: string; amountInr: number }[] }>(row.estimate);
      platformFees += num(estimate.lines?.find((l) => l.key === "platform")?.amountInr);
    }
    const demo = await db<{ n: number }>`select count(*)::int as n from bookings where is_demo_provider = true or is_demo_customer = true`;
    return {
      ok: true as const,
      people: Object.fromEntries(people.map((p) => [p.role, num(p.n)])),
      bookings: bookings.map((b) => ({ status: b.status, count: num(b.n), gross: num(b.gross) })),
      pendingVerifications: num(pendingV[0]?.n),
      openComplaints: num(openC[0]?.n),
      platformFees,
      demoBookings: num(demo[0]?.n),
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const rows = await db<Record<string, unknown>>`
      select p.user_id, p.role, p.full_name, p.city, p.phone, p.created_at, u.email
      from profiles p
      left join "user" u on u.id = p.user_id
      order by p.created_at desc`;
    return {
      ok: true as const,
      users: rows.map((r) => ({
        userId: String(r.user_id),
        role: String(r.role),
        name: String(r.full_name),
        city: r.city == null ? "" : String(r.city),
        phone: r.phone == null ? "" : String(r.phone),
        email: r.email == null ? "" : String(r.email),
        createdAt: iso(r.created_at),
        demo: String(r.user_id).startsWith("demo"),
      })),
    };
  });

export const adminListProviders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeed();
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const rows = await db<Record<string, unknown>>`
      select pp.user_id, pp.verification_status, pp.is_demo, pp.base_city, pp.trust_score, pp.jobs_completed, pr.full_name
      from provider_profiles pp join profiles pr on pr.user_id = pp.user_id
      order by pp.created_at desc`;
    return {
      ok: true as const,
      providers: rows.map((r) => ({
        userId: String(r.user_id),
        name: String(r.full_name),
        city: String(r.base_city),
        status: String(r.verification_status),
        isDemo: Boolean(r.is_demo),
        trustScore: num(r.trust_score),
        jobs: num(r.jobs_completed),
      })),
    };
  });

export const adminSetProvider = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const action = str(bag(input).action, 20);
    if (!["suspend", "reactivate", "reject"].includes(action)) throw new Error("Unknown action.");
    return { userId: str(bag(input).userId, 80), action };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    if (data.action === "suspend") {
      await db`update provider_profiles set verification_status = 'suspended' where user_id = ${data.userId}`;
    } else if (data.action === "reject") {
      await db`update provider_profiles set verification_status = 'rejected' where user_id = ${data.userId}`;
    } else {
      const approved = await db`select id from verification_records where provider_user_id = ${data.userId} and status = 'approved' limit 1`;
      const next = approved.length ? "verified" : "unverified";
      await db`update provider_profiles set verification_status = ${next} where user_id = ${data.userId}`;
    }
    await audit(db, context.userId, `provider.${data.action}`, data.userId, data.action);
    return { ok: true as const };
  });

export const adminListVerifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeed();
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const rows = await db<Record<string, unknown>>`
      select v.*, pr.full_name from verification_records v
      left join profiles pr on pr.user_id = v.provider_user_id
      order by v.id desc`;
    return {
      ok: true as const,
      records: rows.map((r) => ({
        id: num(r.id),
        providerUserId: String(r.provider_user_id),
        name: r.full_name == null ? String(r.provider_user_id) : String(r.full_name),
        docType: String(r.doc_type),
        referenceLabel: r.reference_label == null ? "" : String(r.reference_label),
        fileName: r.file_name == null ? "" : String(r.file_name),
        hasFile: Boolean(r.file_data),
        fileData: r.file_data == null ? null : String(r.file_data),
        status: String(r.status),
        consent: Boolean(r.consent),
        createdAt: iso(r.created_at),
      })),
    };
  });

export const adminReviewVerification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const decision = str(bag(input).decision, 20);
    if (decision !== "approved" && decision !== "rejected") throw new Error("Choose approve or reject.");
    return { id: num(bag(input).id), decision, note: str(bag(input).note, 240) };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const rows = await db<Record<string, unknown>>`select * from verification_records where id = ${data.id}`;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Record not found." };
    if (!row.consent) return { ok: false as const, error: "Cannot review a document without recorded consent." };
    await db`update verification_records set status = ${data.decision}, reviewer_user_id = ${context.userId},
      review_note = ${data.note}, reviewed_at = now() where id = ${data.id}`;
    const providerId = String(row.provider_user_id);
    if (data.decision === "approved") {
      await db`update provider_profiles set verification_status = 'verified' where user_id = ${providerId} and verification_status <> 'suspended'`;
      await notify(db, providerId, "Verification approved", "Your verified badge is now shown.", "/provider/profile");
    } else {
      await db`update provider_profiles set verification_status = 'rejected' where user_id = ${providerId} and verification_status <> 'suspended'`;
      await notify(db, providerId, "Verification needs another look", data.note || "The document was rejected.", "/provider/profile");
    }
    await audit(db, context.userId, `verification.${data.decision}`, providerId, data.note);
    return { ok: true as const };
  });

export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeed();
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const rows = await db<Record<string, unknown>>`select * from bookings order by id desc limit 80`;
    return { ok: true as const, bookings: rows.map(mapBookingList) };
  });

export const adminListComplaints = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeed();
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const rows = await db<Record<string, unknown>>`select * from complaints order by id desc limit 50`;
    return {
      ok: true as const,
      complaints: rows.map((r) => ({
        id: num(r.id),
        userId: String(r.user_id),
        bookingId: r.booking_id == null ? null : num(r.booking_id),
        subject: String(r.subject),
        body: String(r.body),
        status: String(r.status),
        adminNote: r.admin_note == null ? "" : String(r.admin_note),
        createdAt: iso(r.created_at),
        demo: String(r.user_id).startsWith("demo"),
      })),
    };
  });

export const adminUpdateComplaint = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const status = str(bag(input).status, 20);
    if (!["open", "reviewing", "upheld", "dismissed"].includes(status)) throw new Error("Unknown status.");
    return { id: num(bag(input).id), status, note: str(bag(input).note, 400) };
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const prev = await db<Record<string, unknown>>`select * from complaints where id = ${data.id}`;
    if (!prev[0]) return { ok: false as const, error: "Complaint not found." };
    await db`update complaints set status = ${data.status}, admin_note = ${data.note}, updated_at = now() where id = ${data.id}`;
    if (data.status === "upheld" && prev[0].status !== "upheld" && prev[0].booking_id) {
      const booking = await loadOwnedBooking(db, num(prev[0].booking_id));
      if (booking) {
        await db`update provider_profiles set complaint_count = complaint_count + 1 where user_id = ${String(booking.provider_user_id)}`;
        await refreshTrust(db, String(booking.provider_user_id));
      }
    }
    await audit(db, context.userId, "complaint.update", String(data.id), `${data.status}: ${data.note}`);
    return { ok: true as const };
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeed();
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const rows = await db<Record<string, unknown>>`
      select r.id, r.rating, r.body, r.is_demo, r.hidden, r.provider_user_id, p.full_name
      from reviews r left join profiles p on p.user_id = r.provider_user_id
      order by r.id desc limit 40`;
    return {
      ok: true as const,
      reviews: rows.map((r) => ({
        id: num(r.id),
        rating: num(r.rating),
        body: String(r.body),
        isDemo: Boolean(r.is_demo),
        hidden: Boolean(r.hidden),
        providerName: r.full_name == null ? String(r.provider_user_id) : String(r.full_name),
      })),
    };
  });

export const adminHideReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({ id: num(bag(input).id), hidden: Boolean(bag(input).hidden) }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const rows = await db<Record<string, unknown>>`select * from reviews where id = ${data.id}`;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Review not found." };
    if (Boolean(row.hidden) === data.hidden) return { ok: true as const };
    const delta = data.hidden ? -1 : 1;
    await db`update reviews set hidden = ${data.hidden} where id = ${data.id}`;
    await db`update provider_profiles set rating_sum = rating_sum + ${delta * num(row.rating)}, review_count = review_count + ${delta}
      where user_id = ${String(row.provider_user_id)}`;
    await refreshTrust(db, String(row.provider_user_id));
    await audit(db, context.userId, data.hidden ? "review.hide" : "review.restore", String(data.id), "");
    return { ok: true as const };
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    const settings = await db<Record<string, unknown>>`select * from platform_settings where id = 1`;
    const categories = await db<Record<string, unknown>>`select slug, name, starting_price_inr, active from service_categories order by sort_order`;
    const logs = await db<Record<string, unknown>>`select action, target, detail, created_at from audit_logs order by id desc limit 20`;
    const s = settings[0] ?? {};
    return {
      ok: true as const,
      settings: {
        platformFeePct: num(s.platform_fee_pct, 8),
        gstPct: num(s.gst_pct, 18),
        urgencySameDayPct: num(s.urgency_same_day_pct, 15),
        urgencyEmergencyPct: num(s.urgency_emergency_pct, 35),
        cancelFreeHours: num(s.cancel_free_hours, 4),
        cancelFeePct: num(s.cancel_fee_pct, 20),
        materialBufferPct: num(s.material_buffer_pct, 10),
      },
      categories: categories.map((c) => ({
        slug: String(c.slug),
        name: String(c.name),
        startingPriceInr: num(c.starting_price_inr),
        active: Boolean(c.active),
      })),
      audit: logs.map((l) => ({
        action: String(l.action),
        target: l.target == null ? "" : String(l.target),
        detail: l.detail == null ? "" : String(l.detail),
        at: iso(l.created_at),
      })),
    };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const i = bag(input);
    const settings = {
      platformFeePct: clamp(num(i.platformFeePct), 0, 30),
      gstPct: clamp(num(i.gstPct), 0, 28),
      urgencySameDayPct: clamp(num(i.urgencySameDayPct), 0, 80),
      urgencyEmergencyPct: clamp(num(i.urgencyEmergencyPct), 0, 100),
      cancelFreeHours: Math.round(clamp(num(i.cancelFreeHours, 4), 0, 72)),
      cancelFeePct: clamp(num(i.cancelFeePct), 0, 80),
      materialBufferPct: clamp(num(i.materialBufferPct), 0, 40),
    };
    return settings;
  })
  .handler(async ({ context, data }) => {
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    await db`update platform_settings set platform_fee_pct = ${data.platformFeePct}, gst_pct = ${data.gstPct},
      urgency_same_day_pct = ${data.urgencySameDayPct}, urgency_emergency_pct = ${data.urgencyEmergencyPct},
      cancel_free_hours = ${data.cancelFreeHours}, cancel_fee_pct = ${data.cancelFeePct},
      material_buffer_pct = ${data.materialBufferPct} where id = 1`;
    await audit(db, context.userId, "settings.update", "platform", JSON.stringify(data));
    return { ok: true as const };
  });

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const adminUpdateCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => ({
    slug: str(bag(input).slug, 40),
    startingPriceInr: Math.round(clamp(num(bag(input).startingPriceInr), 0, 20000)),
    active: Boolean(bag(input).active),
  }))
  .handler(async ({ context, data }) => {
    const db = await getDb();
    if (!(await requireAdmin(db, context.userId))) return { ok: false as const, error: "Administrators only." };
    await db`update service_categories set starting_price_inr = ${data.startingPriceInr}, active = ${data.active} where slug = ${data.slug}`;
    await audit(db, context.userId, "category.update", data.slug, String(data.startingPriceInr));
    return { ok: true as const };
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const message = str(bag(input).message, 800);
    if (message.length < 2) throw new Error("Ask a question first.");
    return { message };
  })
  .handler(async ({ context, data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: true as const,
        available: false as const,
        text: "Assistant is not configured in this environment. The built-in guide does not invent booking details.",
      };
    }
    const db = await getDb();
    const bookings = await db<Record<string, unknown>>`
      select public_id, status, category_name, preferred_date from bookings
      where customer_user_id = ${context.userId} or provider_user_id = ${context.userId}
      order by id desc limit 5`;
    const summary = bookings
      .map((b) => `${b.public_id} ${b.category_name} ${b.status} on ${day(b.preferred_date)}`)
      .join("; ");
    try {
      const res = await fetch("https://api.example.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "provider-4.5",
          max_tokens: 350,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are Homely's assistant for household services in India. Prices are INR estimates, not guaranteed quotes. Verified badges require admin review. No card payments are taken. Do not invent booking statuses. If a status is not in the user's bookings, say you cannot see it. Be brief.",
            },
            {
              role: "user",
              content: `Bookings you can see: ${summary || "none"}.\nQuestion: ${data.message}`,
            },
          ],
        }),
      });
      if (!res.ok) return { ok: false as const, error: `The assistant could not answer (${res.status}).` };
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content?.trim() || "No answer came back.";
      return { ok: true as const, available: true as const, text };
    } catch {
      return { ok: false as const, error: "The assistant could not be reached." };
    }
  });
