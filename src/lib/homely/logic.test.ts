import assert from "node:assert/strict";
import test from "node:test";
import { cancellationQuote, estimatePrice } from "./pricing.ts";
import { rankProviders } from "./ranking.ts";
import { trustScore } from "./trust.ts";

test("estimate adds labour, materials, travel, fee, and tax", () => {
  const quote = estimatePrice({
    categorySlug: "plumbing",
    urgency: "standard",
    distanceKm: 5,
    rates: {
      hourlyRateInr: 400,
      travelPerKmInr: 12,
      materialBufferPct: 10,
      platformFeePct: 8,
      gstPct: 18,
      urgencySameDayPct: 15,
      urgencyEmergencyPct: 35,
    },
  });
  assert.equal(quote.lines.find((l) => l.key === "labour")?.amountInr, 600);
  assert.equal(quote.lines.find((l) => l.key === "materials")?.amountInr, 60);
  assert.equal(quote.lines.find((l) => l.key === "travel")?.amountInr, 40);
  assert.equal(quote.lines.find((l) => l.key === "urgency")?.amountInr, 0);
  assert.equal(quote.totalInr, 892);
  assert.equal(quote.duration.source, "preliminary");
});

test("cancellation is free outside the window", () => {
  const free = cancellationQuote({
    agreedTotalInr: 892,
    appointmentDate: "2026-12-01",
    slot: "morning",
    now: new Date("2026-11-30T09:00:00+05:30"),
    freeHours: 4,
    feePct: 20,
  });
  assert.equal(free.free, true);
  assert.equal(free.feeInr, 0);
  const late = cancellationQuote({
    agreedTotalInr: 1000,
    appointmentDate: "2026-12-01",
    slot: "morning",
    now: new Date("2026-12-01T08:00:00+05:30"),
    freeHours: 4,
    feePct: 20,
  });
  assert.equal(late.free, false);
  assert.equal(late.feeInr, 200);
});

test("trust ignores a thin review history via the prior", () => {
  const early = trustScore({
    avgRating: 5,
    reviewCount: 1,
    onTimeRate: 1,
    completionRate: 1,
    upheldComplaints: 0,
    completedJobs: 4,
  });
  assert.equal(early.early, true);
  assert.ok(early.score < 100);
});

test("closer professional ranks above a farther one", () => {
  const [first] = rankProviders([
    {
      id: "far",
      distanceKm: 14,
      skillMatch: true,
      slotMatch: true,
      availableNow: true,
      startingPriceInr: 300,
      budgetInr: null,
      avgRating: 4,
      reviewCount: 10,
      trustScore: 80,
      verified: true,
      urgency: "standard",
    },
    {
      id: "near",
      distanceKm: 1,
      skillMatch: true,
      slotMatch: true,
      availableNow: true,
      startingPriceInr: 300,
      budgetInr: null,
      avgRating: 4,
      reviewCount: 10,
      trustScore: 80,
      verified: true,
      urgency: "standard",
    },
  ]);
  assert.equal(first?.id, "near");
  assert.match(first?.reason ?? "", /Closest|Available|Best rated|Strong/);
});
