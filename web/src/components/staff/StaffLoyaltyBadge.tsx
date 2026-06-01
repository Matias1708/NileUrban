"use client";

import { normalizePhone } from "@/lib/phone";
import {
  LOYALTY_REWARD_LABELS,
  LOYALTY_CYCLE_DAYS,
  getLoyaltyProgress,
  getPrimaryPendingReward,
} from "@/lib/loyalty-logic";
import type { LoyaltyProfile, LoyaltyRewardId } from "@/lib/types/booking";

interface StaffLoyaltyBadgeProps {
  profile?: LoyaltyProfile | null;
  compact?: boolean;
  onRedeem?: (reward: LoyaltyRewardId) => void;
}

export function StaffLoyaltyBadge({ profile, compact, onRedeem }: StaffLoyaltyBadgeProps) {
  if (!profile) return null;

  const progress = getLoyaltyProgress(profile);
  const primary = getPrimaryPendingReward(progress.pendingRewards);

  if (compact) {
    return (
      <div className="staff-loyalty-badge staff-loyalty-badge--compact">
        <span className="staff-loyalty-points">{progress.points}/10</span>
        {primary ? (
          <span className="staff-loyalty-reward" title={LOYALTY_REWARD_LABELS[primary]}>
            🎁 {LOYALTY_REWARD_LABELS[primary]}
          </span>
        ) : progress.nextMilestone ? (
          <span className="staff-loyalty-next">
            +{progress.pointsToNext} → {LOYALTY_REWARD_LABELS[progress.nextMilestone.reward]}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="staff-loyalty-badge">
      <p className="staff-loyalty-title">Fidelidad · {progress.points}/10 pts</p>
      {progress.pendingRewards.length > 0 ? (
        <ul className="staff-loyalty-pending">
          {progress.pendingRewards.map((reward) => (
            <li key={reward}>
              <span>{LOYALTY_REWARD_LABELS[reward]}</span>
              {onRedeem ? (
                <button
                  type="button"
                  className="staff-loyalty-redeem"
                  onClick={() => onRedeem(reward)}
                >
                  Canjeado
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : progress.nextMilestone ? (
        <p className="staff-loyalty-hint">
          Faltan {progress.pointsToNext} visita{progress.pointsToNext !== 1 ? "s" : ""} para{" "}
          {LOYALTY_REWARD_LABELS[progress.nextMilestone.reward]}
        </p>
      ) : null}
      <p className="staff-loyalty-hint">
        Renueva en {progress.daysUntilReset}d · ciclo {LOYALTY_CYCLE_DAYS} días
      </p>
    </div>
  );
}

export function lookupLoyaltyProfile(
  contacto: string,
  loyaltyByPhone: Record<string, LoyaltyProfile>
): LoyaltyProfile | null {
  if (!contacto) return null;
  return loyaltyByPhone[contacto] ?? loyaltyByPhone[normalizePhone(contacto)] ?? null;
}
