import { CATEGORIES } from "./catalog";

const FAQ: { test: RegExp; answer: string }[] = [
  {
    test: /cancel|reschedul/,
    answer:
      "You can cancel or reschedule a visit that is still pending or accepted. If you cancel inside the free window (4 hours by default, set by the platform), a cancellation charge is shown before you confirm. It is recorded against the booking — Homely does not charge a card. In progress and completed visits cannot be cancelled from your side.",
  },
  {
    test: /price|cost|fee|quote|₹|rs\b|rupee/,
    answer:
      "Prices are estimates in INR: labour + estimated materials + travel + any urgency charge + platform fee + indicative GST. You see the breakdown before you confirm. If the job is different on site, the professional proposes a revision and it applies only after you approve it.",
  },
  {
    test: /verif|badge|aadhaar|kyc|safe|trust/,
    answer:
      "A verified badge appears only after an administrator reviews a document the professional submitted with consent. Homely does not store full Aadhaar numbers and does not pretend a face check succeeded. Trust scores use reviews, punctuality, completed visits, and upheld complaints only — open complaints do not lower the score.",
  },
  {
    test: /pay|upi|card|razor/,
    answer:
      "Payment is recorded as pay-on-completion. No card numbers are stored, and no payment gateway is connected, so nothing is charged automatically.",
  },
  {
    test: /status|track|where is|progress/,
    answer:
      "Open your booking to see the status trail: pending, accepted, in progress, completed, or cancelled. Each change is timestamped. Demo professionals can be stepped through on the booking page and are labelled as a simulation.",
  },
  {
    test: /complaint|dispute|problem|report/,
    answer:
      "Use Help or the booking page to report a problem. Complaints go to the administrator queue. They do not automatically change a professional's trust score unless the administrator upholds them.",
  },
  {
    test: /remind/,
    answer:
      "From your customer dashboard you can save a maintenance reminder with a date. Reminders stay in your account. Email and SMS are not connected, so Homely will not claim a text was sent.",
  },
  {
    test: /otp|sms|email reset|forgot/,
    answer:
      "OTP and reset emails are not connected. There is no fake verification tick. Change a password from your profile while signed in, or use Google or X if you registered that way.",
  },
];

export function guideReply(message: string): { text: string; categorySlug: string | null } {
  const q = message.trim().toLowerCase();
  if (!q) {
    return { text: "Ask about booking, prices, cancellation, or which service you need.", categorySlug: null };
  }
  const hit = FAQ.find((f) => f.test.test(q));
  const category = CATEGORIES.find(
    (c) => q.includes(c.slug) || q.includes(c.name.toLowerCase()) || c.tasks.some((t) => q.includes(t.toLowerCase().slice(0, 8))),
  );
  const keyword = [
    ["plumb", "plumbing", "leak", "tap", "drain", "pipe"],
    ["electric", "switch", "fan", "wiring", "mcb", "light"],
    ["clean", "dust", "mop", "housekeep"],
    ["wash", "geyser", "microwave", "appliance", "purifier"],
    ["carpent", "wood", "door", "wardrobe", "shelf"],
    ["paint", "damp", "wall colour", "wall color"],
    ["pest", "cockroach", "ant", "termite", "mosquito"],
    ["ac", "air condition", "fridge", "refrigerat", "cooling"],
    ["handyman", "maintenance", "odd job", "curtain"],
  ] as const;
  const slugs = ["plumbing", "electrical", "cleaning", "appliance", "carpentry", "painting", "pest", "ac", "maintenance"];
  let guessed: string | null = category?.slug ?? null;
  if (!guessed) {
    const idx = keyword.findIndex((words) => words.some((w) => q.includes(w)));
    if (idx >= 0) guessed = slugs[idx] ?? null;
  }
  if (hit && guessed) {
    const name = CATEGORIES.find((c) => c.slug === guessed)?.name ?? guessed;
    return {
      text: `${hit.answer}\n\nThis also sounds like ${name}. You can start a booking from Services and compare nearby professionals.`,
      categorySlug: guessed,
    };
  }
  if (hit) return { text: hit.answer, categorySlug: null };
  if (guessed) {
    const cat = CATEGORIES.find((c) => c.slug === guessed)!;
    return {
      text: `That sounds like ${cat.name}. Typical tasks: ${cat.tasks.join(", ")}. Indicative visits start around ₹${cat.startingPriceInr}. Open the service to compare professionals — prices stay estimates until you confirm a breakdown.`,
      categorySlug: guessed,
    };
  }
  if (/book|hire|need|help/.test(q)) {
    return {
      text: "Tell me the problem in plain words — a leak, a fan, a deep clean — and I will point you at a category. Then use Find a professional: address, time, photos if you want, compare, and confirm the estimate.",
      categorySlug: null,
    };
  }
  return {
    text: "I can help with booking steps, estimates, cancellation, verification, and picking a service. Try “leaking tap in Indiranagar” or “how do cancellations work?”. I will not invent a booking status.",
    categorySlug: null,
  };
}
