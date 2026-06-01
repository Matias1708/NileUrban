"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BARBERS, type BarberName } from "@/lib/constants";
import { useStaffAuth } from "@/components/staff/StaffAuthProvider";
import {
  loadBarberSchedules,
  saveBarberSchedule,
  seedDefaultSchedulesIfEmpty,
} from "@/lib/barber-schedules";
import { validateScheduleConfig } from "@/lib/scheduling/barber-config";
import type { BarberScheduleConfig } from "@/lib/types/schedule";
import { ALL_SLOT_OPTIONS, WEEKDAY_LABELS } from "@/lib/types/schedule";

const WORK_DAYS = [1, 2, 3, 4, 5, 6] as const;

function SlotGrid({
  selected,
  onChange,
  label,
}: {
  selected: string[];
  onChange: (slots: string[]) => void;
  label: string;
}) {
  function toggle(slot: string) {
    if (selected.includes(slot)) {
      onChange(selected.filter((s) => s !== slot));
    } else {
      onChange([...selected, slot].sort());
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-white/90">{label}</p>
      <div className="flex flex-wrap gap-2">
        {ALL_SLOT_OPTIONS.map((slot) => {
          const active = selected.includes(slot);
          return (
            <button
              key={slot}
              type="button"
              onClick={() => toggle(slot)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "bg-gold text-black"
                  : "border border-white/20 bg-surface text-muted hover:border-gold/50"
              }`}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BarberEditor({
  config,
  onChange,
  onSave,
  saving,
}: {
  config: BarberScheduleConfig;
  onChange: (c: BarberScheduleConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  function toggleOffDay(day: number) {
    const off = config.offWeekdays.includes(day);
    onChange({
      ...config,
      offWeekdays: off
        ? config.offWeekdays.filter((d) => d !== day)
        : [...config.offWeekdays, day].sort(),
    });
  }

  function toggleBlocked(day: number, slot: string) {
    const current = config.blockedByWeekday[day] ?? [];
    const next = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot];
    onChange({
      ...config,
      blockedByWeekday: { ...config.blockedByWeekday, [day]: next },
    });
  }

  return (
    <div className="card space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gold">{config.barber}</h2>
        <button type="button" className="btn-primary text-sm" disabled={saving} onClick={onSave}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <div>
        <p className="label mb-3">Días que no trabaja</p>
        <div className="flex flex-wrap gap-3">
          {WORK_DAYS.map((day) => (
            <label key={day} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.offWeekdays.includes(day)}
                onChange={() => toggleOffDay(day)}
                className="rounded"
              />
              {WEEKDAY_LABELS[day]}
            </label>
          ))}
        </div>
      </div>

      <SlotGrid
        label="Horarios habituales (martes a sábado por defecto)"
        selected={config.defaultSlots}
        onChange={(defaultSlots) => onChange({ ...config, defaultSlots })}
      />

      <div>
        <p className="label mb-3">Excepciones por día</p>
        <p className="mb-4 text-xs text-muted">
          Podés definir horarios distintos para un día (ej. lunes solo tarde) o bloquear turnos puntuales.
        </p>
        <div className="space-y-2">
          {WORK_DAYS.map((day) => {
            const hasOverride = Boolean(config.weekdaySlots[day]?.length);
            const isOpen = expandedDay === day;
            return (
              <div key={day} className="rounded-lg border border-white/10 bg-background/50">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
                  onClick={() => setExpandedDay(isOpen ? null : day)}
                >
                  <span>
                    {WEEKDAY_LABELS[day]}
                    {config.offWeekdays.includes(day) && (
                      <span className="ml-2 text-red-400">(no trabaja)</span>
                    )}
                    {hasOverride && !config.offWeekdays.includes(day) && (
                      <span className="ml-2 text-gold">(horario custom)</span>
                    )}
                  </span>
                  <span className="text-muted">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && !config.offWeekdays.includes(day) && (
                  <div className="space-y-4 border-t border-white/10 px-4 py-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={hasOverride}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange({
                              ...config,
                              weekdaySlots: {
                                ...config.weekdaySlots,
                                [day]: [...config.defaultSlots],
                              },
                            });
                          } else {
                            const { [day]: _, ...rest } = config.weekdaySlots;
                            onChange({ ...config, weekdaySlots: rest });
                          }
                        }}
                      />
                      Usar horarios distintos este día
                    </label>

                    {hasOverride && (
                      <SlotGrid
                        label={`Horarios del ${WEEKDAY_LABELS[day].toLowerCase()}`}
                        selected={config.weekdaySlots[day] ?? []}
                        onChange={(slots) =>
                          onChange({
                            ...config,
                            weekdaySlots: { ...config.weekdaySlots, [day]: slots },
                          })
                        }
                      />
                    )}

                    <div>
                      <p className="mb-2 text-sm text-white/80">Bloquear turnos puntuales</p>
                      <div className="flex flex-wrap gap-2">
                        {(config.weekdaySlots[day] ?? config.defaultSlots).map((slot) => {
                          const blocked = (config.blockedByWeekday[day] ?? []).includes(slot);
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => toggleBlocked(day, slot)}
                              className={`rounded px-2 py-0.5 text-xs ${
                                blocked
                                  ? "bg-red-500/30 line-through"
                                  : "border border-white/15 text-muted"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <label htmlFor={`min-${config.barber}-${day}`}>Desde (opcional):</label>
                      <select
                        id={`min-${config.barber}-${day}`}
                        className="input max-w-[8rem] py-1 text-sm"
                        value={config.minTimeByWeekday[day] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const next = { ...config.minTimeByWeekday };
                          if (val) next[day] = val;
                          else delete next[day];
                          onChange({ ...config, minTimeByWeekday: next });
                        }}
                      >
                        <option value="">Sin mínimo</option>
                        {ALL_SLOT_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-background/40 p-4">
        <p className="mb-2 text-sm font-medium">Regla especial (opcional)</p>
        <p className="mb-3 text-xs text-muted">
          Ej: Lautaro no atiende 18:20 y 19:00 excepto los sábados.
        </p>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(config.excludeTimesUnlessWeekday)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange({
                  ...config,
                  excludeTimesUnlessWeekday: { times: ["18:20", "19:00"], unlessWeekday: 6 },
                });
              } else {
                const { excludeTimesUnlessWeekday: _, ...rest } = config;
                onChange(rest as BarberScheduleConfig);
              }
            }}
          />
          Excluir ciertos horarios salvo un día
        </label>
        {config.excludeTimesUnlessWeekday && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Excepto:</span>
            <select
              className="input max-w-[9rem] py-1"
              value={config.excludeTimesUnlessWeekday.unlessWeekday}
              onChange={(e) =>
                onChange({
                  ...config,
                  excludeTimesUnlessWeekday: {
                    ...config.excludeTimesUnlessWeekday!,
                    unlessWeekday: Number(e.target.value),
                  },
                })
              }
            >
              {WORK_DAYS.map((d) => (
                <option key={d} value={d}>{WEEKDAY_LABELS[d]}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1">
              {["18:20", "19:00"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`rounded px-2 py-0.5 text-xs ${
                    config.excludeTimesUnlessWeekday!.times.includes(t)
                      ? "bg-gold text-black"
                      : "border border-white/20"
                  }`}
                  onClick={() => {
                    const cur = config.excludeTimesUnlessWeekday!.times;
                    const times = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
                    onChange({
                      ...config,
                      excludeTimesUnlessWeekday: {
                        ...config.excludeTimesUnlessWeekday!,
                        times,
                      },
                    });
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StaffHorariosClient() {
  const { staff } = useStaffAuth();
  const router = useRouter();
  const [schedules, setSchedules] = useState<Record<BarberName, BarberScheduleConfig> | null>(null);
  const [activeBarber, setActiveBarber] = useState<BarberName>("Pablo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = staff?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await seedDefaultSchedulesIfEmpty();
      setSchedules(await loadBarberSchedules(true));
    } catch {
      setError("No se pudieron cargar los horarios. Revisá la conexión a Firebase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (staff && !isAdmin) {
      router.replace("/staff");
      return;
    }
    if (isAdmin) load();
  }, [staff, isAdmin, load, router]);

  async function handleSaveBarber() {
    if (!schedules) return;
    const config = schedules[activeBarber];
    const err = validateScheduleConfig(config);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveBarberSchedule(config);
      setMessage(`Horarios de ${activeBarber} guardados. Los cambios aplican en reservas al instante.`);
    } catch {
      setError("Error al guardar. Verificá permisos de Firestore.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return null;

  if (loading) {
    return <p className="text-muted">Cargando horarios...</p>;
  }

  if (!schedules) {
    return <p className="text-red-400">{error || "Sin datos."}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">Horarios y disponibilidad</h1>
        <p className="mt-2 text-sm text-muted">
          Configurá qué días trabaja cada barbero y qué turnos ofrece. Los clientes ven los cambios al reservar.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {BARBERS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => {
              setActiveBarber(b);
              setMessage("");
              setError("");
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeBarber === b
                ? "bg-gold text-black"
                : "bg-surface text-muted hover:text-white"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      <BarberEditor
        config={schedules[activeBarber]}
        onChange={(c) => setSchedules({ ...schedules, [activeBarber]: c })}
        onSave={handleSaveBarber}
        saving={saving}
      />
    </div>
  );
}
