import type { LoyaltyProfile, LoyaltyRewardId } from "@/lib/types/booking";
import { normalizePhone } from "@/lib/phone";

export const LOYALTY_CYCLE = 8;
export const LOYALTY_CYCLE_DAYS = 45;
export const LOYALTY_POINTS_PER_CUT = 2;
export const LOYALTY_POINTS_PER_PRODUCT = 1;
export const LOYALTY_POINTS_ABONO_RENEWAL = 2;

export const LOYALTY_MILESTONES: { at: number; reward: LoyaltyRewardId }[] = [
  { at: 3, reward: "discount_20_product" },
  { at: 6, reward: "discount_20_cut" },
  { at: 8, reward: "free_cut" },
];

export const LOYALTY_REWARD_LABELS: Record<LoyaltyRewardId, string> = {
  discount_20_product: "20% desc. en productos",
  discount_20_cut: "20% desc. en corte",
  free_cut: "Corte gratis",
};

const LEGACY_REWARD_LABELS: Record<string, string> = {
  discount_20: "20% de descuento",
  premium: "Servicio premium",
};

export function getRewardLabel(reward: LoyaltyRewardId | string): string {
  return LOYALTY_REWARD_LABELS[reward as LoyaltyRewardId] ?? LEGACY_REWARD_LABELS[reward] ?? reward;
}

/** "1 punto" / "2 puntos" */
export function formatPoints(n: number): string {
  return `${n} punto${n !== 1 ? "s" : ""}`;
}

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
  const pendingRewards = (profile.pendingRewards ?? []) as LoyaltyRewardId[];
  const next = LOYALTY_MILESTONES.find((m) => m.at > points) ?? null;
  const cycleExpired = isLoyaltyCycleExpired(profile, now);

  return {
    points,
    totalVisits: profile.totalVisits ?? 0,
    pendingRewards,
    nextMilestone: next,
    pointsToNext: next ? next.at - points : 0,
    daysUntilReset: daysUntilCycleReset(profile, now),
    cycleExpired,
  };
}

function applyPointsEarned(current: {
  points: number;
  totalVisits: number;
  pendingRewards: LoyaltyRewardId[];
}, earned: number, countVisit: boolean) {
  const totalVisits = countVisit ? current.totalVisits + 1 : current.totalVisits;
  let points = current.points + earned;
  const pendingRewards = [...current.pendingRewards];

  for (const milestone of LOYALTY_MILESTONES) {
    if (points >= milestone.at && !pendingRewards.includes(milestone.reward)) {
      pendingRewards.push(milestone.reward);
    }
  }

  if (points >= LOYALTY_CYCLE) {
    points = points - LOYALTY_CYCLE;
  }

  return { points, totalVisits, pendingRewards };
}

/** Corte atendido: +2 pts desde el primer corte. */
export function applyVisitToLoyalty(current: {
  points: number;
  totalVisits: number;
  pendingRewards: LoyaltyRewardId[];
}): { points: number; totalVisits: number; pendingRewards: LoyaltyRewardId[] } {
  return applyPointsEarned(current, LOYALTY_POINTS_PER_CUT, true);
}

/** Compra de producto: +1 pt. */
export function applyProductToLoyalty(current: {
  points: number;
  totalVisits: number;
  pendingRewards: LoyaltyRewardId[];
}): { points: number; totalVisits: number; pendingRewards: LoyaltyRewardId[] } {
  return applyPointsEarned(current, LOYALTY_POINTS_PER_PRODUCT, false);
}

/** Renovación de abono mensual: +2 pts de regalo. */
export function applyAbonoRenewalToLoyalty(current: {
  points: number;
  totalVisits: number;
  pendingRewards: LoyaltyRewardId[];
}): { points: number; totalVisits: number; pendingRewards: LoyaltyRewardId[] } {
  return applyPointsEarned(current, LOYALTY_POINTS_ABONO_RENEWAL, false);
}

export function getPrimaryPendingReward(pending: LoyaltyRewardId[]): LoyaltyRewardId | null {
  const order: LoyaltyRewardId[] = ["free_cut", "discount_20_cut", "discount_20_product"];
  for (const id of order) {
    if (pending.includes(id)) return id;
  }
  return null;
}

export function formatLoyaltyWhatsAppMessage(
  nombre: string,
  profile: Pick<LoyaltyProfile, "points" | "totalVisits" | "pendingRewards" | "cycleStartedAt" | "lastVisit">,
  pointsEarned = LOYALTY_POINTS_PER_CUT
): string {
  const progress = getLoyaltyProgress(profile);
  const lines: string[] = [
    `¡Hola ${nombre}! 💈`,
    "",
    `Sumaste ${pointsEarned} punto${pointsEarned !== 1 ? "s" : ""} en Nile Urban Lounge.`,
    `Puntos actuales: ${progress.points}/${LOYALTY_CYCLE}`,
  ];

  if (progress.pendingRewards.length > 0) {
    lines.push("");
    const label = progress.pendingRewards.length === 1 ? "Premio disponible" : "Premios disponibles";
    lines.push(`🎁 ${label}:`);
    for (const reward of progress.pendingRewards) {
      lines.push(`· ${getRewardLabel(reward)}`);
    }
    lines.push("Avisanos al pagar para canjearlo (un beneficio por vez).");
  }

  if (progress.nextMilestone && progress.pointsToNext > 0) {
    lines.push("");
    lines.push(
      `Te faltan ${progress.pointsToNext} punto${progress.pointsToNext !== 1 ? "s" : ""} para ${getRewardLabel(progress.nextMilestone.reward)}.`
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
  profile: Pick<LoyaltyProfile, "points" | "totalVisits" | "pendingRewards" | "cycleStartedAt" | "lastVisit">,
  pointsEarned?: number
): string | null {
  const normalized = normalizePhone(contacto);
  if (normalized.length < 8) return null;

  const waPhone = `549${normalized}`;
  const message = encodeURIComponent(formatLoyaltyWhatsAppMessage(nombre, profile, pointsEarned));
  return `https://api.whatsapp.com/send?phone=${waPhone}&text=${message}`;
}

export const LOYALTY_BENEFIT_NOTE =
  "Cada premio se canjea por separado: los puntos no se acumulan ni se combinan para obtener el mismo beneficio más de una vez en el mismo ciclo.";
