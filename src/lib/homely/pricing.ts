import { CATEGORY_HOURS } from "./catalog.ts";

export type Urgency = "standard" | "same_day" | "emergency";
export type TimeSlot = "morning" | "afternoon" | "evening";

export type RateCard = {
  hourlyRateInr: number;
  travelPerKmInr: number;
  materialBufferPct: number;
  platformFeePct: number;
  gstPct: number;
  urgencySameDayPct: number;
  urgencyEmergencyPct: number;
};

export type PriceLine = { key: string; label: string; amountInr: number; note: string };

export type PriceEstimate = {
  lines: PriceLine[];
  subtotalInr: number;
  totalInr: number;
  assumptions: string[];
  duration: {
    minutes: number;
    low: number;
    high: number;
    label: string;
    source: "preliminary";
  };
};

export function estimatePrice(input: {
  categorySlug: string;
  urgency: Urgency;
  distanceKm: number;
  rates: RateCard;
  hours?: number;
}): PriceEstimate {
  const hours = input.hours ?? CATEGORY_HOURS[input.categorySlug] ?? 2;
  const labour = Math.round(input.rates.hourlyRateInr * hours);
  const materials = Math.round(labour * (input.rates.materialBufferPct / 100));
  const billableKm = Math.max(0, input.distanceKm - 3);
  const travel =
    input.distanceKm <= 3 ? 0 : Math.max(40, Math.round(billableKm * input.rates.travelPerKmInr));
  const urgencyPct =
    input.urgency === "emergency"
      ? input.rates.urgencyEmergencyPct
      : input.urgency === "same_day"
        ? input.rates.urgencySameDayPct
        : 0;
  const urgency = Math.round(labour * (urgencyPct / 100));
  const subtotal = labour + materials + travel + urgency;
  const platform = Math.round(subtotal * (input.rates.platformFeePct / 100));
  const tax = Math.round((subtotal + platform) * (input.rates.gstPct / 100));
  const total = subtotal + platform + tax;
  const baseMin = Math.round(hours * 60 * (input.urgency === "emergency" ? 0.9 : 1));
  const spread = Math.max(15, Math.round(baseMin * 0.25));

  return {
    lines: [
      {
        key: "labour",
        label: "Labour",
        amountInr: labour,
        note: `${hours} h typical visit × ₹${input.rates.hourlyRateInr}/h`,
      },
      {
        key: "materials",
        label: "Estimated materials",
        amountInr: materials,
        note: `${input.rates.materialBufferPct}% of labour until the professional sees the job`,
      },
      {
        key: "travel",
        label: "Travel",
        amountInr: travel,
        note:
          input.distanceKm <= 3
            ? "Within 3 km — no travel charge"
            : `${billableKm.toFixed(1)} km beyond 3 km, minimum ₹40`,
      },
      {
        key: "urgency",
        label: "Urgency charge",
        amountInr: urgency,
        note: urgencyPct ? `${urgencyPct}% of labour` : "Standard slot — no urgency charge",
      },
      {
        key: "platform",
        label: "Platform fee",
        amountInr: platform,
        note: `${input.rates.platformFeePct}% of the service subtotal`,
      },
      {
        key: "tax",
        label: "GST (indicative)",
        amountInr: tax,
        note: `${input.rates.gstPct}% on subtotal + platform fee, if configured`,
      },
    ],
    subtotalInr: subtotal,
    totalInr: total,
    assumptions: [
      "This is an estimate, not a guaranteed quote.",
      "Material cost is a buffer. The professional can propose a revision if the job differs.",
      "A revised total applies only after you approve it.",
      "GST is indicative and follows the platform setting.",
    ],
    duration: {
      minutes: baseMin,
      low: Math.max(30, baseMin - spread),
      high: baseMin + spread,
      label:
        "Preliminary estimate from typical job length for this category. Not a trained model prediction.",
      source: "preliminary",
    },
  };
}

export function slotStartHour(slot: TimeSlot): number {
  if (slot === "morning") return 9;
  if (slot === "afternoon") return 13;
  return 17;
}

export function cancellationQuote(input: {
  agreedTotalInr: number;
  appointmentDate: string;
  slot: TimeSlot;
  now: Date;
  freeHours: number;
  feePct: number;
}): { feeInr: number; hoursUntil: number; free: boolean; detail: string } {
  const hour = String(slotStartHour(input.slot)).padStart(2, "0");
  const appt = new Date(`${input.appointmentDate}T${hour}:00:00+05:30`);
  const hoursUntil = (appt.getTime() - input.now.getTime()) / 36e5;
  if (!Number.isFinite(hoursUntil)) {
    return { feeInr: 0, hoursUntil: 0, free: true, detail: "The visit time could not be read, so no fee is applied." };
  }
  if (hoursUntil >= input.freeHours) {
    return {
      feeInr: 0,
      hoursUntil,
      free: true,
      detail: `More than ${input.freeHours} hours before the visit — cancellation is free.`,
    };
  }
  const feeInr = Math.round(input.agreedTotalInr * (input.feePct / 100));
  return {
    feeInr,
    hoursUntil,
    free: false,
    detail: `Inside ${input.freeHours} hours of the visit — a ${input.feePct}% cancellation charge (₹${feeInr}) applies. This is recorded, not collected by a card gateway.`,
  };
}

export function inr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}
