"use client";

import { useEffect, useState } from "react";
import { getLoyaltyByPhone } from "@/lib/loyalty";
import {
  LOYALTY_CYCLE,
  LOYALTY_CYCLE_DAYS,
  LOYALTY_MILESTONES,
  LOYALTY_REWARD_LABELS,
  getLoyaltyProgress,
} from "@/lib/loyalty-logic";
import type { LoyaltyProfile } from "@/lib/types/booking";

export function LoyaltyCard({ phone }: { phone: string }) {
  const [profile, setProfile] = useState<LoyaltyProfile | null>(null);

  useEffect(() => {
    if (!phone) return;
    getLoyaltyByPhone(phone)
      .then(setProfile)
      .catch(() => {});
  }, [phone]);

  if (!profile) return null;

  const progress = getLoyaltyProgress(profile);
  const pct = Math.min(100, (progress.points / LOYALTY_CYCLE) * 100);

  return (
    <div className="card mb-6 border-gold/30 bg-gold/5">
      <h3 className="font-semibold text-gold">Programa de fidelidad</h3>
      <p className="mt-2 text-sm text-white/80">
        Puntos: <strong>{progress.points}</strong> / {LOYALTY_CYCLE}
        {" · "}
        Visitas totales: <strong>{progress.totalVisits}</strong>
      </p>

      <div className="loyalty-progress mt-4" aria-hidden>
        <div className="loyalty-progress-track">
          <div className="loyalty-progress-fill" style={{ width: `${pct}%` }} />
          {LOYALTY_MILESTONES.map((m) => (
            <span
              key={m.at}
              className={`loyalty-progress-marker ${progress.points >= m.at ? "is-reached" : ""}`}
              style={{ left: `${(m.at / LOYALTY_CYCLE) * 100}%` }}
              title={LOYALTY_REWARD_LABELS[m.reward]}
            />
          ))}
        </div>
        <div className="loyalty-progress-labels">
          {LOYALTY_MILESTONES.map((m) => (
            <span key={m.at} style={{ left: `${(m.at / LOYALTY_CYCLE) * 100}%` }}>
              {m.at}
            </span>
          ))}
        </div>
      </div>

      {progress.pendingRewards.length > 0 ? (
        <div className="mt-4 space-y-1">
          {progress.pendingRewards.map((reward) => (
            <p key={reward} className="text-sm font-medium text-green-400">
              Premio disponible: {LOYALTY_REWARD_LABELS[reward]}
            </p>
          ))}
          <p className="text-xs text-muted">Avisá al barbero al pagar para canjearlo.</p>
        </div>
      ) : progress.nextMilestone ? (
        <p className="mt-3 text-sm text-muted">
          {progress.pointsToNext} punto{progress.pointsToNext !== 1 ? "s" : ""} más para{" "}
          {LOYALTY_REWARD_LABELS[progress.nextMilestone.reward]}
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Seguí sumando visitas para tu próximo premio.</p>
      )}
      <p className="mt-3 text-xs text-muted">
        El ciclo se renueva cada {LOYALTY_CYCLE_DAYS} días
        {progress.daysUntilReset > 0
          ? ` · quedan ${progress.daysUntilReset} día${progress.daysUntilReset !== 1 ? "s" : ""}`
          : ""}
        .
      </p>
    </div>
  );
}
