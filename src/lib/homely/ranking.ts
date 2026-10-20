export type RankInput = {
  id: string;
  distanceKm: number | null;
  skillMatch: boolean;
  slotMatch: boolean;
  availableNow: boolean;
  startingPriceInr: number;
  budgetInr: number | null;
  avgRating: number;
  reviewCount: number;
  trustScore: number;
  verified: boolean;
  urgency: "standard" | "same_day" | "emergency" | "";
};

export type Ranked = RankInput & { rankScore: number; reason: string; parts: Record<string, number> };

const REASONS: { key: string; label: string }[] = [
  { key: "distance", label: "Closest available professional" },
  { key: "rating", label: "Best rated" },
  { key: "budget", label: "Best match for your budget" },
  { key: "slot", label: "Available for your time slot" },
  { key: "trust", label: "Strong completion record" },
];

export function rankProviders(rows: RankInput[]): Ranked[] {
  const ranked = rows.map((row) => {
    const distance =
      row.distanceKm == null ? 8 : Math.max(0, 35 - Math.min(35, (row.distanceKm / 15) * 35));
    const skill = row.skillMatch ? 20 : 0;
    const slot = row.slotMatch ? 15 : row.availableNow ? 6 : 0;
    const budget =
      row.budgetInr == null
        ? 4
        : row.startingPriceInr <= row.budgetInr
          ? 10
          : Math.max(0, 10 - (row.startingPriceInr - row.budgetInr) / 200);
    const rating = (Math.max(0, Math.min(5, row.avgRating)) / 5) * 12;
    const trust = (Math.max(0, Math.min(100, row.trustScore)) / 100) * 8;
    const urgent =
      row.urgency === "emergency" && row.availableNow && (row.distanceKm ?? 99) <= 8 ? 8 : 0;
    const verify = row.verified ? 4 : 0;
    const parts = { distance, skill, slot, budget, rating, trust, urgent, verify };
    const rankScore = Math.round(distance + skill + slot + budget + rating + trust + urgent + verify);
    const reasonPool = [
      { key: "distance", value: distance },
      { key: "rating", value: rating + (row.reviewCount > 0 ? 2 : 0) },
      { key: "budget", value: row.budgetInr == null ? 0 : budget },
      { key: "slot", value: slot },
      { key: "trust", value: trust },
    ].sort((a, b) => b.value - a.value);
    const reason = REASONS.find((r) => r.key === reasonPool[0]?.key)?.label ?? "Suitable nearby professional";
    return { ...row, rankScore, reason, parts };
  });
  ranked.sort((a, b) => b.rankScore - a.rankScore || a.startingPriceInr - b.startingPriceInr);
  return ranked;
}
