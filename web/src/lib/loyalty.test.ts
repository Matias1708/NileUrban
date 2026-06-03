import { describe, expect, it } from "vitest";
import {
  applyVisitToLoyalty,
  applyProductToLoyalty,
  applyAbonoRenewalToLoyalty,
  getLoyaltyProgress,
  getPrimaryPendingReward,
  LOYALTY_CYCLE,
  LOYALTY_CYCLE_DAYS,
  LOYALTY_POINTS_PER_CUT,
  normalizeLoyaltyCycle,
  isLoyaltyCycleExpired,
  daysUntilCycleReset,
  formatLoyaltyWhatsAppMessage,
} from "./loyalty-logic";

describe("applyVisitToLoyalty", () => {
  it("sums 2 points per cut and unlocks milestones", () => {
    let state = { points: 0, totalVisits: 0, pendingRewards: [] as ("discount_20_product" | "discount_20_cut" | "free_cut")[] };

    state = applyVisitToLoyalty(state);
    expect(state.points).toBe(2);
    expect(state.totalVisits).toBe(1);

    state = applyProductToLoyalty(state);
    expect(state.points).toBe(3);
    expect(state.pendingRewards).toContain("discount_20_product");

    state = applyVisitToLoyalty(state);
    state = applyVisitToLoyalty(state);
    expect(state.points).toBe(7);

    state = applyProductToLoyalty(state);
    expect(state.points).toBe(0);
    expect(state.pendingRewards).toContain("free_cut");
    expect(state.totalVisits).toBe(3);
  });

  it("does not duplicate pending rewards", () => {
    const state = applyProductToLoyalty({
      points: 2,
      totalVisits: 1,
      pendingRewards: ["discount_20_product"],
    });
    expect(state.pendingRewards.filter((r) => r === "discount_20_product")).toHaveLength(1);
  });
});

describe("applyAbonoRenewalToLoyalty", () => {
  it("adds 2 points without counting a visit", () => {
    const state = applyAbonoRenewalToLoyalty({ points: 0, totalVisits: 2, pendingRewards: [] });
    expect(state.points).toBe(2);
    expect(state.totalVisits).toBe(2);
  });
});

describe("getLoyaltyProgress", () => {
  it("computes next milestone", () => {
    const progress = getLoyaltyProgress({
      points: 4,
      totalVisits: 2,
      pendingRewards: ["discount_20_product"],
    });
    expect(progress.pointsToNext).toBe(2);
    expect(progress.nextMilestone?.reward).toBe("discount_20_cut");
  });
});

describe("getPrimaryPendingReward", () => {
  it("prefers free cut over other rewards", () => {
    expect(
      getPrimaryPendingReward(["discount_20_product", "discount_20_cut", "free_cut"])
    ).toBe("free_cut");
  });
});

describe("formatLoyaltyWhatsAppMessage", () => {
  it("includes points and next milestone", () => {
    const msg = formatLoyaltyWhatsAppMessage("Juan", {
      points: 4,
      totalVisits: 2,
      pendingRewards: [],
      cycleStartedAt: new Date().toISOString(),
    });
    expect(msg).toContain("Juan");
    expect(msg).toContain(`4/${LOYALTY_CYCLE}`);
    expect(msg).toContain(`Sumaste ${LOYALTY_POINTS_PER_CUT} puntos`);
    expect(msg).not.toContain("http");
  });
});

describe("LOYALTY_CYCLE", () => {
  it("is 8", () => {
    expect(LOYALTY_CYCLE).toBe(8);
  });
});

describe("loyalty cycle reset", () => {
  const now = new Date("2026-06-01T12:00:00");

  it("resets points and pending rewards after 45 days", () => {
    const start = new Date("2026-04-01T12:00:00").toISOString();
    const { profile, wasReset } = normalizeLoyaltyCycle(
      {
        contacto: "1164380904",
        nombre: "Juan",
        points: 7,
        totalVisits: 12,
        pendingRewards: ["discount_20_product"],
        cycleStartedAt: start,
      },
      now
    );

    expect(wasReset).toBe(true);
    expect(profile.points).toBe(0);
    expect(profile.pendingRewards).toEqual([]);
    expect(profile.totalVisits).toBe(12);
  });

  it("computes days until reset", () => {
    const start = new Date("2026-05-01T12:00:00").toISOString();
    expect(
      daysUntilCycleReset({ cycleStartedAt: start, lastVisit: undefined }, now)
    ).toBe(14);
    expect(isLoyaltyCycleExpired({ cycleStartedAt: start }, now)).toBe(false);
    expect(LOYALTY_CYCLE_DAYS).toBe(45);
  });
});
