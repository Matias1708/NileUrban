import { describe, expect, it } from "vitest";
import {
  applyVisitToLoyalty,
  getLoyaltyProgress,
  getPrimaryPendingReward,
  LOYALTY_CYCLE,
  LOYALTY_CYCLE_DAYS,
  normalizeLoyaltyCycle,
  isLoyaltyCycleExpired,
  daysUntilCycleReset,
  formatLoyaltyWhatsAppMessage,
} from "./loyalty-logic";

describe("applyVisitToLoyalty", () => {
  it("sums points and unlocks milestone rewards", () => {
    let state = { points: 0, totalVisits: 0, pendingRewards: [] as ("discount_20" | "premium" | "free_cut")[] };

    for (let i = 0; i < 4; i++) {
      state = applyVisitToLoyalty(state);
    }
    expect(state.points).toBe(4);
    expect(state.pendingRewards).toEqual([]);

    state = applyVisitToLoyalty(state);
    expect(state.points).toBe(5);
    expect(state.pendingRewards).toContain("discount_20");

    state = applyVisitToLoyalty(state);
    state = applyVisitToLoyalty(state);
    state = applyVisitToLoyalty(state);
    expect(state.points).toBe(8);
    expect(state.pendingRewards).toContain("premium");

    state = applyVisitToLoyalty(state);
    state = applyVisitToLoyalty(state);
    expect(state.points).toBe(0);
    expect(state.pendingRewards).toContain("free_cut");
    expect(state.totalVisits).toBe(10);
  });

  it("does not duplicate pending rewards in the same cycle", () => {
    const state = applyVisitToLoyalty({
      points: 4,
      totalVisits: 4,
      pendingRewards: ["discount_20"],
    });
    expect(state.pendingRewards.filter((r) => r === "discount_20")).toHaveLength(1);
  });
});

describe("getLoyaltyProgress", () => {
  it("computes next milestone", () => {
    const progress = getLoyaltyProgress({
      points: 6,
      totalVisits: 6,
      pendingRewards: ["discount_20"],
    });
    expect(progress.pointsToNext).toBe(2);
    expect(progress.nextMilestone?.reward).toBe("premium");
  });
});

describe("getPrimaryPendingReward", () => {
  it("prefers free cut over other rewards", () => {
    expect(
      getPrimaryPendingReward(["discount_20", "premium", "free_cut"])
    ).toBe("free_cut");
  });
});

describe("formatLoyaltyWhatsAppMessage", () => {
  it("includes points and next milestone", () => {
    const msg = formatLoyaltyWhatsAppMessage("Juan", {
      points: 4,
      totalVisits: 4,
      pendingRewards: [],
      cycleStartedAt: new Date().toISOString(),
    });
    expect(msg).toContain("Juan");
    expect(msg).toContain("4/10");
    expect(msg).toContain("Te faltan 1 visita");
    expect(msg).toContain("20% de descuento");
    expect(msg).not.toContain("http");
  });

  it("lists pending rewards when unlocked", () => {
    const msg = formatLoyaltyWhatsAppMessage("Ana", {
      points: 5,
      totalVisits: 5,
      pendingRewards: ["discount_20"],
      cycleStartedAt: new Date().toISOString(),
    });
    expect(msg).toContain("Premio disponible");
    expect(msg).toContain("20% de descuento");
  });
});

describe("LOYALTY_CYCLE", () => {
  it("is 10", () => {
    expect(LOYALTY_CYCLE).toBe(10);
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
        pendingRewards: ["discount_20"],
        cycleStartedAt: start,
      },
      now
    );

    expect(wasReset).toBe(true);
    expect(profile.points).toBe(0);
    expect(profile.pendingRewards).toEqual([]);
    expect(profile.totalVisits).toBe(12);
    expect(profile.cycleStartedAt).toBe(now.toISOString());
  });

  it("keeps progress within 45 days", () => {
    const start = new Date("2026-05-01T12:00:00").toISOString();
    const { profile, wasReset } = normalizeLoyaltyCycle(
      {
        contacto: "1164380904",
        nombre: "Juan",
        points: 4,
        totalVisits: 4,
        pendingRewards: [],
        cycleStartedAt: start,
      },
      now
    );

    expect(wasReset).toBe(false);
    expect(profile.points).toBe(4);
  });

  it("computes days until reset", () => {
    const start = new Date("2026-05-01T12:00:00").toISOString();
    expect(
      daysUntilCycleReset({ cycleStartedAt: start, lastVisit: undefined }, now)
    ).toBe(14);
    expect(isLoyaltyCycleExpired({ cycleStartedAt: start }, now)).toBe(false);
  });
});
