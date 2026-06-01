import type { LoyaltyProfile, LoyaltyRewardId } from "@/lib/types/booking";
import { normalizePhone } from "@/lib/phone";

export const LOYALTY_CYCLE = 10;
export const LOYALTY_CYCLE_DAYS = 45;

export const LOYALTY_MILESTONES: { at: number; reward: LoyaltyRewardId }[] = [
  { at: 5, reward: "discount_20" },
  { at: 8, reward: "premium" },
  { at: 10, reward: "free_cut" },
];

export const LOYALTY_REWARD_LABELS: Record<LoyaltyRewardId, string> = {
  discount_20: "20% de descuento",
  premium: "Servicio premium",
  free_cut: "Corte gratis",
};

export interface LoyaltyProgress {
  points: number;
  totalVisits: number;
  pendingRewards: LoyaltyRewardId[];
  nextMilestone: { at: number; reward: LoyaltyRewardId } | null;
  pointsToNext: number;
  daysUntilReset: number;
  cycleExpired: boolean;
}

function parseDMYToDate(dmy: string): Date | null {
  const parts = dmy.split("/");
  if (parts.length !== 3) return null;
  const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveCycleStart(
  profile: Pick<LoyaltyProfile, "cycleStartedAt" | "lastVisit">,
  fallback = new Date()
): Date {
  if (profile.cycleStartedAt) {
    const d = new Date(profile.cycleStartedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (profile.lastVisit) {
    const fromVisit = parseDMYToDate(profile.lastVisit);
    if (fromVisit) return fromVisit;
  }
  return fallback;
}

export function isLoyaltyCycleExpired(
  profile: Pick<LoyaltyProfile, "cycleStartedAt" | "lastVisit">,
  now = new Date()
): boolean {
  const start = resolveCycleStart(profile, now);
  const elapsedMs = now.getTime() - start.getTime();
  return elapsedMs >= LOYALTY_CYCLE_DAYS * 24 * 60 * 60 * 1000;
}

export function daysUntilCycleReset(
  profile: Pick<LoyaltyProfile, "cycleStartedAt" | "lastVisit">,
  now = new Date()
): number {
  const start = resolveCycleStart(profile, now);
  const endMs = start.getTime() + LOYALTY_CYCLE_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((endMs - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export function resetLoyaltyCycleProfile(profile: LoyaltyProfile, now = new Date()): LoyaltyProfile {
  return {
    ...profile,
    points: 0,
    pendingRewards: [],
    cycleStartedAt: now.toISOString(),
  };
}

/** Aplica reinicio de 45 días si corresponde; ancla ciclo en perfiles legacy. */
export function normalizeLoyaltyCycle(
  profile: LoyaltyProfile,
  now = new Date()
): { profile: LoyaltyProfile; wasReset: boolean; needsPersist: boolean } {
  let current = profile;

  if (!current.cycleStartedAt) {
    current = {
      ...current,
      cycleStartedAt: resolveCycleStart(current, now).toISOString(),
    };
  }

  if (isLoyaltyCycleExpired(current, now)) {
    return {
      profile: resetLoyaltyCycleProfile(current, now),
      wasReset: true,
      needsPersist: true,
    };
  }

  const needsPersist = !profile.cycleStartedAt;
  return { profile: current, wasReset: false, needsPersist };
}

export function getLoyaltyProgress(
  profile: Pick<LoyaltyProfile, "points" | "totalVisits" | "pendingRewards" | "cycleStartedAt" | "lastVisit">,
  now = new Date()
): LoyaltyProgress {
  const points = profile.points ?? 0;
  const pendingRewards = profile.pendingRewards ?? [];
  const next = LOYALTY_MILESTONES.find((m) => m.at > points) ?? null;
  const cycleExpired = isLoyaltyCycleExpired(profile, now);

  return {
    points,
    totalVisits: profile.totalVisits ?? profile.points ?? 0,
    pendingRewards,
    nextMilestone: next,
    pointsToNext: next ? next.at - points : 0,
    daysUntilReset: daysUntilCycleReset(profile, now),
    cycleExpired,
  };
}

export function applyVisitToLoyalty(current: {
  points: number;
  totalVisits: number;
  pendingRewards: LoyaltyRewardId[];
}): { points: number; totalVisits: number; pendingRewards: LoyaltyRewardId[] } {
  const totalVisits = current.totalVisits + 1;
  let points = current.points + 1;
  const pendingRewards = [...current.pendingRewards];

  for (const milestone of LOYALTY_MILESTONES) {
    if (points === milestone.at && !pendingRewards.includes(milestone.reward)) {
      pendingRewards.push(milestone.reward);
    }
  }

  if (points >= LOYALTY_CYCLE) {
    points = 0;
  }

  return { points, totalVisits, pendingRewards };
}

export function getPrimaryPendingReward(pending: LoyaltyRewardId[]): LoyaltyRewardId | null {
  const order: LoyaltyRewardId[] = ["free_cut", "premium", "discount_20"];
  for (const id of order) {
    if (pending.includes(id)) return id;
  }
  return null;
}

export function formatLoyaltyWhatsAppMessage(
  nombre: string,
  profile: Pick<LoyaltyProfile, "points" | "totalVisits" | "pendingRewards" | "cycleStartedAt" | "lastVisit">
): string {
  const progress = getLoyaltyProgress(profile);
  const lines: string[] = [
    `¡Hola ${nombre}! 💈`,
    "",
    "Sumaste 1 punto en Nile Urban Lounge.",
    `Puntos actuales: ${progress.points}/${LOYALTY_CYCLE}`,
  ];

  if (progress.pendingRewards.length > 0) {
    lines.push("");
    const label = progress.pendingRewards.length === 1 ? "Premio disponible" : "Premios disponibles";
    lines.push(`🎁 ${label}:`);
    for (const reward of progress.pendingRewards) {
      lines.push(`· ${LOYALTY_REWARD_LABELS[reward]}`);
    }
    lines.push("Avisanos al pagar para canjearlo.");
  }

  if (progress.nextMilestone && progress.pointsToNext > 0) {
    lines.push("");
    const visitLabel = progress.pointsToNext === 1 ? "visita" : "visitas";
    lines.push(
      `Te faltan ${progress.pointsToNext} ${visitLabel} para ${LOYALTY_REWARD_LABELS[progress.nextMilestone.reward]}.`
    );
  }

  lines.push("");
  lines.push("¡Gracias por elegirnos!");
  lines.push("Nile Urban Lounge");

  return lines.join("\n");
}

export function buildLoyaltyWhatsAppUrl(
  contacto: string,
  nombre: string,
  profile: Pick<LoyaltyProfile, "points" | "totalVisits" | "pendingRewards" | "cycleStartedAt" | "lastVisit">
): string | null {
  const normalized = normalizePhone(contacto);
  if (normalized.length < 8) return null;

  const waPhone = `549${normalized}`;
  const message = encodeURIComponent(formatLoyaltyWhatsAppMessage(nombre, profile));
  return `https://api.whatsapp.com/send?phone=${waPhone}&text=${message}`;
}
