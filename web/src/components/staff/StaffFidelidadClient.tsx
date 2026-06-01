"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getAllLoyaltyProfiles,
  redeemLoyaltyReward,
  LOYALTY_CYCLE,
  LOYALTY_CYCLE_DAYS,
  LOYALTY_REWARD_LABELS,
  getLoyaltyProgress,
} from "@/lib/loyalty";
import type { LoyaltyProfileWithId } from "@/lib/loyalty";
import type { LoyaltyRewardId } from "@/lib/types/booking";
import { normalizePhone } from "@/lib/phone";

type FilterMode = "all" | "pending";

function matchesSearch(profile: LoyaltyProfileWithId, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const phone = profile.contacto.toLowerCase();
  const name = profile.nombre.toLowerCase();
  const normalized = normalizePhone(query);
  return name.includes(q) || phone.includes(q) || (normalized.length > 0 && phone.includes(normalized));
}

export function StaffFidelidadClient() {
  const [profiles, setProfiles] = useState<LoyaltyProfileWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllLoyaltyProfiles();
      setProfiles(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (filter === "pending" && !(p.pendingRewards?.length ?? 0)) return false;
      return matchesSearch(p, search);
    });
  }, [profiles, search, filter]);

  const stats = useMemo(() => {
    const withPending = profiles.filter((p) => (p.pendingRewards?.length ?? 0) > 0).length;
    return { total: profiles.length, withPending };
  }, [profiles]);

  async function handleRedeem(contacto: string, reward: LoyaltyRewardId) {
    if (!confirm(`¿Marcar "${LOYALTY_REWARD_LABELS[reward]}" como canjeado para este cliente?`)) {
      return;
    }
    await redeemLoyaltyReward(contacto, reward);
    await load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gold">Programa de fidelidad</h1>
          <p className="mt-1 text-sm text-muted">
            Todos los clientes con puntos acumulados · ciclo de {LOYALTY_CYCLE} visitas · renueva cada{" "}
            {LOYALTY_CYCLE_DAYS} días
          </p>
        </div>
        <Link
          href="/staff"
          className="rounded-lg border-2 border-[#555] bg-[#333] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white no-underline transition hover:bg-[#555]"
        >
          ← Agenda
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card border-gold/20">
          <p className="text-sm text-muted">Clientes en el programa</p>
          <p className="mt-1 text-3xl font-bold text-gold">{stats.total}</p>
        </div>
        <div className="card border-green-500/20">
          <p className="text-sm text-muted">Con premio pendiente</p>
          <p className="mt-1 text-3xl font-bold text-green-400">{stats.withPending}</p>
        </div>
        <div className="card border-white/10 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-muted">Hitos del ciclo</p>
          <p className="mt-2 text-xs leading-relaxed text-white/75">
            5 pts → 20% off · 8 pts → Premium · 10 pts → Corte gratis · Reset cada {LOYALTY_CYCLE_DAYS}{" "}
            días
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="search"
          className="input min-w-[220px] flex-1"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-auto min-w-[180px]"
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterMode)}
        >
          <option value="all">Todos los clientes</option>
          <option value="pending">Solo con premio pendiente</option>
        </select>
        <button type="button" className="btn-secondary" onClick={load}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <p className="text-center text-muted">Cargando clientes...</p>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-muted">
          {profiles.length === 0
            ? "Todavía no hay clientes con visitas registradas. Los puntos aparecen cuando marcás un turno como Atendido en la agenda."
            : "Ningún cliente coincide con la búsqueda."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="finance-table staff-fidelidad-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Puntos</th>
                <th>Visitas</th>
                <th>Renueva en</th>
                <th>Próximo premio</th>
                <th>Pendientes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile) => {
                const progress = getLoyaltyProgress(profile);
                const pct = Math.min(100, (progress.points / LOYALTY_CYCLE) * 100);

                return (
                  <tr key={profile.id}>
                    <td className="font-medium text-white">{profile.nombre}</td>
                    <td>
                      <a
                        href={`https://api.whatsapp.com/send?phone=549${profile.contacto}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00e676] hover:underline"
                      >
                        {profile.contacto}
                      </a>
                    </td>
                    <td>
                      <div className="staff-fidelidad-points">
                        <span className="font-bold text-gold">
                          {progress.points}/{LOYALTY_CYCLE}
                        </span>
                        <span className="staff-fidelidad-bar" aria-hidden>
                          <span className="staff-fidelidad-bar-fill" style={{ width: `${pct}%` }} />
                        </span>
                      </div>
                    </td>
                    <td>{progress.totalVisits}</td>
                    <td className="text-sm">
                      {progress.daysUntilReset > 0 ? (
                        <span className="text-white/80">
                          {progress.daysUntilReset} día{progress.daysUntilReset !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-amber-400">Hoy</span>
                      )}
                    </td>
                    <td className="text-sm text-muted">
                      {progress.nextMilestone
                        ? `${progress.pointsToNext} visita${progress.pointsToNext !== 1 ? "s" : ""} → ${LOYALTY_REWARD_LABELS[progress.nextMilestone.reward]}`
                        : "—"}
                    </td>
                    <td>
                      {(profile.pendingRewards?.length ?? 0) > 0 ? (
                        <ul className="staff-fidelidad-pending-list">
                          {profile.pendingRewards!.map((reward) => (
                            <li key={reward}>
                              <span className="text-green-400">{LOYALTY_REWARD_LABELS[reward]}</span>
                              <button
                                type="button"
                                className="staff-loyalty-redeem"
                                onClick={() => handleRedeem(profile.contacto, reward)}
                              >
                                Canjeado
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
