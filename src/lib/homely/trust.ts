/**
 * Dynamic trust score.
 *
 * Trust = 45% review quality + 25% punctuality + 20% completion + 10% clean record.
 * Review quality uses a Bayesian average (prior 4.2 over 3 imagined reviews) so one
 * new rating cannot define a professional. Only administrator-upheld complaints
 * reduce the clean-record term. Open or dismissed complaints do not.
 * Punctuality uses tracked visit starts once 3 exist; before that, a stated rate
 * is shown and labelled as not yet measured on Homely.
 */
export const TRUST_NOTE =
  "Trust = 45% review quality (Bayesian average, prior 4.2) + 25% punctuality + 20% completion record + 10% upheld-complaint record. Unverified allegations are not penalised.";

export function trustScore(input: {
  avgRating: number;
  reviewCount: number;
  onTimeRate: number;
  completionRate: number;
  upheldComplaints: number;
  completedJobs: number;
}): { score: number; early: boolean } {
  const priorRating = 4.2;
  const priorWeight = 3;
  const bayes =
    (input.avgRating * input.reviewCount + priorRating * priorWeight) /
    (input.reviewCount + priorWeight);
  const ratingPts = (bayes / 5) * 100;
  const jobs = Math.max(input.completedJobs, 1);
  const complaintRate = Math.min(1, input.upheldComplaints / jobs);
  const raw =
    0.45 * ratingPts +
    0.25 * clamp01(input.onTimeRate) * 100 +
    0.2 * clamp01(input.completionRate) * 100 +
    0.1 * (1 - complaintRate) * 100;
  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    early: input.reviewCount < 3,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
